const path = require('path')
const express = require('express')
const app = express()
const port = 3000

app.use(express.static('public'))
app.use('/data', express.static('data_cleaned'))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'scatter.html'))
})

app.listen(port, () => {
  console.log(`My visualization app is successfully listening at http://localhost:${port}`)
})
