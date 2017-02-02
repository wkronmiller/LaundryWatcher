import got from 'got';
import notifier from 'node-notifier';

const url = 'http://m.laundryview.com/submitFunctions.php?monitor=true&lr=36958937&cell=null&_=1486056271535';

function extractNumber(li) {
    const [_, number,] = />(\d+)&#160;/.exec(li);
    return parseInt(number.trim());
}

function extractStatus(li) {
    const [_, status,] = /aside">(.*)<\/p></.exec(li);
    return status.trim();
}

function parseLi(li) {
    const number = extractNumber(li);
    const status = extractStatus(li);
    return {number, status};
}

function parseTypes(lis, matchStr) {
    return lis
        .filter(li => li.indexOf(matchStr) >= 0)
        .map(parseLi)
        .reduce((obj, {number, status}) => {
            obj[number] = status;
            return obj;
        }, {});
}

function parseBody(body) {
    const pretty = body.replace(/></g, '>\n<');
    const lis = body.replace(/<\/li>/g, '').split('<li>');
    const washers = parseTypes(lis, 'icon_washer');
    const dryers = parseTypes(lis, 'icon_dryer'); 
    return {washers, dryers};
}

function getMachines() {
    return got(url).then(({body}) => parseBody(body));
}

function getMachine(id, type) {
    return getMachines()
        .then(machines => machines[type][id]);
}

async function monitorWasher() {
    const washerNum = 11;
    const status = await getMachine(washerNum, 'washers');
    if(status === 'Avail') {
        return notifier.notify({
            title: 'Laundry Finished',
            message: `Washer ${washerNum} finished`
        });
    }
    console.log('machine status', status);
    setTimeout(monitorWasher, 5000);
}

monitorWasher();
