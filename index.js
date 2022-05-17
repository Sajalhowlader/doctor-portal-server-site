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

        app.get('/booking', async (req, res) => {
            const patientEmail = req.query.patientEmail
            const authorization = req.headers.authorization
            console.log(authorization);
            const query = { patientEmail: patientEmail }
            const booking = await bookingCollection.find(query).toArray()
            res.send(booking)
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