const https = require('https');

async function checkUrl(url) {
    return new Promise(resolve => {
        https.get(url, (res) => {
            resolve({ url, status: res.statusCode });
        }).on('error', () => resolve({ url, status: 'error' }));
    });
}

async function run() {
    const urls = [
        // Source 1: James Overton's repo
        'https://raw.githubusercontent.com/jamesaoverton/tarot-images/main/assets/cards/ar00.jpg',
        'https://raw.githubusercontent.com/jamesaoverton/tarot-images/main/cards/ar00.jpg',
        
        // Source 2: iteles tarot deck repo
        'https://raw.githubusercontent.com/iteles/tarot-deck/master/images/majors/0-the-fool.jpg',
        
        // Source 3: another popular tarot api
        'https://raw.githubusercontent.com/ekelen/tarot-api/master/public/images/cards/ar00.jpg',
        'https://raw.githubusercontent.com/ekelen/tarot-api/master/static/cards/ar00.jpg',
    ];

    for (const url of urls) {
        const res = await checkUrl(url);
        console.log(res);
    }
}

run();
