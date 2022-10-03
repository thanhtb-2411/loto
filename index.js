console.log("Start")
const hbs = require('handlebars')
const fs = require('fs')
const path = require('path')
const csv = require("csvtojson");
const html_to_pdf = require('html-pdf-node');

start()

async function start() {
    const dateTime = new Date().toISOString().slice(0, 10)
    fs.mkdir(dateTime, {recursive: true}, (err) => {
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
        compileTemplate({ve1, ve2}, templateHtml).then(html => {
                html_to_pdf.generatePdf({content: html}, options).then(pdfBuffer => {
                    fs.writeFileSync(dateTime + "/bingo-" + i + ".pdf", pdfBuffer, 'binary');
                })
            }
        )
    }
}

async function compileTemplate(templateData, html) {
    hbs.registerHelper('inc', (value) => parseInt(value, 10) + 1)
    hbs.registerHelper('time_stamp', () => new Date())
    hbs.registerHelper('ifCond', function (v1, operator, v2, options) {
        switch (operator) {
            case '===':
                return (v1 === v2) ? options.fn(this) : options.inverse(this)
            case '!==':
                return (v1 !== v2) ? options.fn(this) : options.inverse(this)
            case '||':
                return (v1 || v2) ? options.fn(this) : options.inverse(this)
            default:
                return options.inverse(this)
        }
    })
    hbs.registerHelper('ifIsNthItem', function (options) {
        const index = options.data.index + 1
        const nth = options.hash.nth

        if (index % nth === 0) return options.fn(this)
        return options.inverse(this)
    })

    return hbs.compile(html)(templateData)
}