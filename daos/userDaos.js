const mongoose = require('mongoose')
const esquemaUser = require('./modelsMDB/schemaUser')


class Usuario {
    async connectMDB() {
        try {
            const URL = "mongodb+srv://tomasSesiones:asd123@tomi.fuaxu.mongodb.net/sesiones?retryWrites=true&w=majority"
            let rta = await mongoose.connect(URL, {
                useNewUrlParser: true,
                useUniFiedTopology: true
            })
        } catch (e) {
            console.log(e)
        }   
    }

    async getAll(id) {
        const filter = id ? { id } : {};
        try {
          await this.connectMDB();
          const userDb = await esquemaUser.find(filter);
          mongoose.disconnect();
          return userDb;
        } catch (error) {
          throw Error(error.message);
        }
      }

}

module.exports = Usuario