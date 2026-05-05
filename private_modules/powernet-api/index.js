const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const https = require('https');

const API_URL = "https://api-main.powernet.com.ru/get.php";

const agent = new https.Agent({ rejectUnauthorized: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36',
    'X-Requested-With': 'com.powermobile.hello',
    'Accept': 'application/json'
};

async function getFullData(login, password) {
    try {
        const paramsAuth = { 
            login, 
            password, 
            apps: 'mobile', 
            key: uuidv4() 
        };

        const { data: authData } = await axios.get(API_URL, { 
            params: paramsAuth, 
            headers: HEADERS,
            httpsAgent: agent 
        });

        if (authData.result !== 0) throw new Error(authData.error_rus || "Auth Failed");

        const user_hash = authData.hash || authData.data?.hash;
        if (!user_hash) throw new Error("No Hash received");

        // Получаем баланс
        const { data: info } = await axios.get(API_URL, { 
            params: { hash: user_hash, model: 'Inetstatus', method: 'getInetStatus', params: '{}' }, 
            headers: HEADERS,
            httpsAgent: agent
        });

        // Получаем дни
        const { data: days } = await axios.get(API_URL, { 
            params: { hash: user_hash, model: 'Inetstatus', method: 'getForecastDisableUserApi', params: '{}' }, 
            headers: HEADERS,
            httpsAgent: agent
        });

        return {
            success: true,
            balance: parseFloat(info.data?.money || 0).toFixed(2),
            name: info.data?.userlogin || login,
            days: days.data?.day?.toString() || '0'
        };
    } catch (e) {
        console.error(`[API ERROR] ${login}:`, e.message);
        return { success: false, msg: e.message };
    }
}

function getAllCameras() {
    try {
        const dumpPath = path.join(__dirname, 'powernet_map_dump.json');
        if (!fs.existsSync(dumpPath)) {
            console.error("!!! DUMP FILE NOT FOUND AT:", dumpPath);
            return [];
        }
        const file = fs.readFileSync(dumpPath, 'utf-8');
        const data = JSON.parse(file);
        return data.data.filter(cam => cam.type === 'public' && cam.status === '1');
    } catch (e) {
        return [];
    }
}

async function getStreamUrl(login, password, streamId) {
    try {
        const { data: authData } = await axios.get(API_URL, { 
            params: { login, password, apps: 'mobile', key: uuidv4() }, 
            headers: HEADERS, httpsAgent: agent 
        });
        const user_hash = authData.hash || authData.data?.hash;

        const { data: camData } = await axios.get(API_URL, { 
            params: { hash: user_hash, model: 'cam', method: 'GetCam', params: JSON.stringify({ stream: streamId }) }, 
            headers: HEADERS, httpsAgent: agent
        });

        if (camData.result === 0 && camData.data?.addrnow) {
            const addrNow = camData.data.addrnow;
            
            const tokenMatch = addrNow.match(/token=([a-f0-9\-]+)/);

            const baseUrlMatch = addrNow.match(/(https:\/\/[^\/]+\/[^\/]+)\//);
            
            if (tokenMatch && baseUrlMatch) {
                const token = tokenMatch[1];
                const baseUrl = baseUrlMatch[1];
                
                return `${baseUrl}/index.m3u8?token=${token}`;
            }
        }
        return null;
    } catch (e) {
        console.error("Get stream URL failed:", e.message);
        return null;
    }
}
async function getNetworkStatus(login, password) {
    try {
        const { data: authData } = await axios.get(API_URL, { 
            params: { login, password, apps: 'mobile', key: uuidv4() }, 
            headers: HEADERS, httpsAgent: agent 
        });
        const user_hash = authData.hash || authData.data?.hash;
        if (!user_hash) throw new Error("Auth Failed");

        const { data: statusData } = await axios.get(API_URL, {
            params: { hash: user_hash, model: 'onOff', method: 'GetAllOffOnUsers', params: '{}' },
            headers: HEADERS, httpsAgent: agent
        });

        return { success: true, hash: user_hash, requests: statusData.data || [] };
    } catch (e) {
        return { success: false, requests: [] };
    }
}
async function resetNetworkStatus(user_hash, zid) {
    try {
        const { data: res } = await axios.get(API_URL, {
            params: { hash: user_hash, model: 'onOn', method: 'RemoveOffOnUsers', params: JSON.stringify({ zid: String(zid) }) },
            headers: HEADERS, httpsAgent: agent
        });
        return res.result === 0;
    } catch (e) {
        return false;
    }
}
async function getPaymentLink(login, amount, methodType = 'sbp') {
    try {
        let payMethod = "createPaySBP";
        if (methodType === 'sber') payMethod = "createPaySberPay";

        const paramsPayload = JSON.stringify({
            amount: Number(amount),
            userlogin: login,
            EmailOrPhone: "",
            payMethod: payMethod
        });

        const { data } = await axios.get(API_URL, {
            params: { not_auth: 1, method: 'makeNewPayNotAuth', params: paramsPayload },
            headers: HEADERS, 
            httpsAgent: agent
        });

        if (data.result === 0 && data.data) {
            if (methodType === 'sbp') return { success: true, url: data.data.QR_DATA };
            if (methodType === 'sber') return { success: true, url: data.data.externalParams?.sbolDeepLink };
        }
        return { success: false, msg: data.error_rus || "Payment Error" };
    } catch (e) {
        return { success: false, msg: e.message };
    }
}

module.exports = { getFullData, getAllCameras, getStreamUrl, getNetworkStatus, resetNetworkStatus, getPaymentLink };