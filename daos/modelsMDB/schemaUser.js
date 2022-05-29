const mongoose = require('mongoose')

const esquemaProducto = new mongoose.Schema({
    mail: {type: String, require: true},
    password: {type: String, require: true}
})

module.exports = mongoose.model('sessions', esquemaProducto)