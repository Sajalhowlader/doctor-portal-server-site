const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express');
var jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000

// MiddleWare
app.use(cors())
app.use(express.json())

const verifyJwt = (req, res, next) => {
    const authorizationToken = req.headers.authorization

    if (!authorizationToken) {
        return res.status(401).send({ message: 'UnAuthorized access' })
    }
    const token = authorizationToken.split(' ')[1]
    // jwt.verify(token, process.env.ACCESS_TOKEN_SECRET), (err, decoded) => {
    //     if (err) {
    //         return res.status(403).send({ message: 'Forbidden Access' })
    //     }
    //     console.log(decoded);
    //     next()
    // }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' })
        }
        req.decoded = decoded
        next()
    });
}



// Root path
app.get('/', (req, res) => {
    res.send('server is connected')
})
//Mongodb collection


const uri = `mongodb+srv://${process.env.DOCTOR_PORTAL_USER}:${process.env.DOCTOR_PORTAL_PASS}@cluster0.3fj2p.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


const run = async () => {
    try {
        await client.connect();
        console.log("connect");
        const servicesCollection = client.db('doctorPortal').collection('services')
        const bookingCollection = client.db('doctorPortal').collection('booking')
        const userCollection = client.db('doctorPortal').collection('user')





        // all service and booking time

        app.get('/services', async (req, res) => {
            const services = servicesCollection.find({})
            const result = await services.toArray()
            res.send(result)
        })

        app.get('/user', verifyJwt, async (req, res) => {
            const allUsers = await userCollection.find().toArray()
            res.send(allUsers)
        })
        // Put method for insert and update user
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body
            const filter = { email: email }
            const option = { upsert: true };
            const updateDoc = {
                $set: user,

            };
            const result = await userCollection.updateOne(filter, updateDoc, option)
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1d" })
            res.send({ result, token })
        })
        // Get an admin
        app.get('/admin/:email', async (req, res) => {
            const adminEmail = req.params.email
            const admin = await userCollection.findOne({ email: adminEmail })
            const isAdmin = admin.role === "admin"
            res.send({ admin: isAdmin })
        })
        // Make an admin
        app.put('/user/admin/:email', verifyJwt, async (req, res) => {
            const email = req.params.email;
            const adminRequester = req.decoded.email
            const adminRequesterEmail = await userCollection.findOne({ email: adminRequester })
            if (adminRequesterEmail.role === "admin") {
                const filter = { email: email }
                const updateDoc = {
                    $set: { role: "admin" },
                };
                const result = await userCollection.updateOne(filter, updateDoc)
                res.send(result)
            } else {
                res.status(403).send({ message: "Forbidden access" })
            }

        })


        // Add one Booking
        app.post('/booking', async (req, res) => {
            const booking = req.body
            const bookingHistory = {
                treatmentName: booking.treatmentName,
                bookingDate: booking.bookingDate,
                patientEmail: booking.patientEmail,
            }
            const exists = await bookingCollection.findOne(bookingHistory);

            if (exists) {
                return res.send({ success: false, booking: exists })
            }
            const setBooking = await bookingCollection.insertOne(booking)

            res.send({ success: true, setBooking })
        })

        app.get('/booking', verifyJwt, async (req, res) => {
            const patientEmail = req.query.patientEmail
            const decodedEmail = req.decoded.email
            if (decodedEmail === patientEmail) {
                const query = { patientEmail: patientEmail }
                const booking = await bookingCollection.find(query).toArray()
                res.send(booking)
            }
            else {
                return res.status(403).send({ message: "Forbidden Access" })
            }

        })


        // Available slot for booking
        app.get('/available', async (req, res) => {

            const bookingDate = req.query.bookingDate
            // step 1: get all services
            const allServices = await servicesCollection.find().toArray()

            // step 2 : get the date
            const query = { bookingDate: bookingDate }
            const bookings = await bookingCollection.find(query).toArray();
            // step 3 : for each service, find bookings for that service
            // allServices.forEach(service => {
            //     const servicesBooking = bookings.filter(b => b.treatmentName === service.name)
            //     const booked = servicesBooking.map(booking => booking.bookingSlot)
            //     const available = allServices.slots.filter(slot => !booked.includes(slot))
            //     service.available = available
            //     // service.booked = booked
            //     // service.booked = servicesBooking.map(s => s.bookingSlot)
            // })
            // res.send(allServices)

            allServices.forEach(service => {
                const servicesBooking = bookings.filter(booking => booking.treatmentName === service.name)
                const bookingSlot = servicesBooking.map(booking => booking.bookingSlot)
                const available = service.slots.filter(s => !bookingSlot.includes(s))
                service.available = available

            })
            res.send(allServices)

        })

    } finally {

    }
}
run().catch(console.dir)
// Port 
app.listen(port, () => {
    console.log("port is running", port);
})