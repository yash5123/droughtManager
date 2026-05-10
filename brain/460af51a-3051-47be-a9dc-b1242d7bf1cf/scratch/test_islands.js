import fetch from 'node-fetch';

const islands = [
    { name: 'Agatti', lat: 10.852, lon: 72.186 },
    { name: 'Kavaratti', lat: 10.567, lon: 72.636 }
];

async function check() {
    for (const island of islands) {
        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${island.lat}&longitude=${island.lon}&start_date=2024-04-01&end_date=2024-04-05&daily=soil_moisture_0_to_7cm_mean&timezone=Asia/Kolkata`;
        const res = await fetch(url);
        const data = await res.json();
        console.log(`${island.name}:`, data.daily.soil_moisture_0_to_7cm_mean);
    }
}

check();
