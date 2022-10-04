console.log("Start")
const hbs = require('handlebars')
const fs = require('fs')
const path = require('path')
const csv = require("csvtojson");
const html_to_pdf = require('html-pdf-node');

start()

async function start() {
    const dateTime = new Date().toISOString().slice(0, 10)
    const bingoPath = "bingo/" + dateTime
    fs.mkdir(bingoPath, {recursive: true}, (err) => {
        if (err) throw err;
    })
    const filePath = path.join(__dirname, `template.hbs`)
    const templateHtml = fs.readFileSync(filePath, 'utf-8')
    const dataCsv = await csv().fromFile("loto.csv")
    const dataGroup = dataCsv.reduce((r, a) => {
        r[a.VeID] = r[a.VeID] || [];
        r[a.VeID].push(a);
        return r;
    }, Object.create(null))

    let index = 1
    let dataListMap = []
    let options = {format: 'A4'};

    while (true) {
        const data = dataGroup[index++]
        if (!data) break
        dataListMap.push(data.map((d, i) => {
            return {...d, divisible: i % 3 === 0}
        }))
    }

    for (let i = 0; i < dataListMap.length; i = i + 2) {
        const ve1 = {data: dataListMap[i], index: i}
        const ve2 = {data: dataListMap[i + 1], index: i + 1}
        const html = compileTemplate({ve1, ve2}, templateHtml)
        html_to_pdf.generatePdf({content: html}, options).then(pdfBuffer => {
            fs.writeFileSync(bingoPath + "/bingo-" + i + ".pdf", pdfBuffer, 'binary');
        })
    }
}

function compileTemplate(templateData, html) {
    return hbs.compile(html)(templateData)
}