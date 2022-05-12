const express = require('express');
const cors = require('cors');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000

// MiddleWare
app.use(cors())
app.use(express.json())

// Root path
app.get('/root', (req, res) => {
    res.send('server is connected')
})

// Port 
app.listen(port, () => {
    console.log("port is running", port);
})