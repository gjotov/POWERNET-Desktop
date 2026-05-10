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

async function getAuthHash(login, password) {
    try {
        const { data } = await axios.get(API_URL, { 
            params: { login, password, apps: 'mobile', key: uuidv4() }, 
            headers: HEADERS, httpsAgent: agent 
        });
        return data.hash || data.data?.hash;
    } catch (e) {
        return null;
    }
}

async function getFullData(login, password) {
    try {
        const user_hash = await getAuthHash(login, password);
        if (!user_hash) throw new Error("Auth Failed");

        const { data: info } = await axios.get(API_URL, { params: { hash: user_hash, model: 'Inetstatus', method: 'getInetStatus', params: '{}' }, headers: HEADERS, httpsAgent: agent });
        const { data: days } = await axios.get(API_URL, { params: { hash: user_hash, model: 'Inetstatus', method: 'getForecastDisableUserApi', params: '{}' }, headers: HEADERS, httpsAgent: agent });

        return {
            success: true,
            balance: parseFloat(info.data?.money || 0).toFixed(2),
            name: info.data?.userlogin || login,
            days: days.data?.day?.toString() || '0'
        };
    } catch (e) { return { success: false, msg: e.message }; }
}

async function getCreditStatus(login, password) {
    try {
        const hash = await getAuthHash(login, password);
        if (!hash) return { success: false };

        const { data } = await axios.get(API_URL, { params: { hash, model: 'credit', method: 'getStatusCredit', params: '{}' }, headers: HEADERS, httpsAgent: agent });
        if (data.result === 0 && data.data) {
            return { success: true, isActive: data.data.db_enable === 1, daysLimit: data.data.db_count_day };
        }
        return { success: false };
    } catch (e) { return { success: false }; }
}

async function activateCredit(login, password, days) {
    try {
        const hash = await getAuthHash(login, password);
        const { data } = await axios.get(API_URL, { params: { hash, model: 'credit', method: 'setCredit', params: JSON.stringify({ countDays: Number(days) }) }, headers: HEADERS, httpsAgent: agent });
        return data.result === 0;
    } catch (e) { return false; }
}

async function getStatData(login, password) {
    try {
        const hash = await getAuthHash(login, password);
        const { data } = await axios.get(API_URL, { params: { hash, model: 'stat', method: 'getStatPay', params: JSON.stringify({ startRow: "0", countRow: "10" }) }, headers: HEADERS, httpsAgent: agent });
        return data.result === 0 ? data.data : [];
    } catch (e) { return []; }
}

async function getPaymentLink(login, amount, methodType = 'sbp') {
    try {
        const payMethod = methodType === 'sber' ? "createPaySberPay" : "createPaySBP";
        const { data } = await axios.get(API_URL, { params: { not_auth: 1, method: 'makeNewPayNotAuth', params: JSON.stringify({ amount: Number(amount), userlogin: login, EmailOrPhone: "", payMethod }) }, headers: HEADERS, httpsAgent: agent });
        if (data.result === 0 && data.data) return { success: true, url: methodType === 'sbp' ? data.data.QR_DATA : data.data.externalParams?.sbolDeepLink };
        return { success: false, msg: data.error_rus || "Payment Error" };
    } catch (e) { return { success: false, msg: e.message }; }
}

function getAllCameras() {
    try {
        const file = fs.readFileSync(path.join(__dirname, 'powernet_map_dump.json'), 'utf-8');
        return JSON.parse(file).data.filter(cam => cam.type === 'public' && cam.status === '1');
    } catch (e) { 
        console.error("DUMP ERROR:", e);
        return []; 
    }
}

async function getStreamUrl(login, password, streamId) {
    try {
        const hash = await getAuthHash(login, password);
        const { data: camData } = await axios.get(API_URL, { params: { hash, model: 'cam', method: 'GetCam', params: JSON.stringify({ stream: streamId }) }, headers: HEADERS, httpsAgent: agent });
        
        if (camData.result === 0 && camData.data?.addrnow) {
            const addrNow = camData.data.addrnow;
            const tokenMatch = addrNow.match(/token=([a-f0-9\-]+)/);
            const baseUrlMatch = addrNow.match(/(https:\/\/[^\/]+\/[^\/]+)\//);
            
            if (tokenMatch && baseUrlMatch) {
                return `${baseUrlMatch[1]}/index.m3u8?token=${tokenMatch[1]}`;
            }
        }
        return null;
    } catch (e) { return null; }
}

module.exports = { getFullData, getAllCameras, getStreamUrl, getPaymentLink, getCreditStatus, activateCredit, getStatData };