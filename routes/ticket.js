const express = require('express');
const router = express.Router()

const {getTickets, checkIn, getBookings, webhook, pay, createTicket } = require('../controllers/buyTicket')

router.get('/tickets', getTickets)
router.get('/bookings', getBookings)
router.post('/check-in', checkIn)
router.post('/webhook', webhook)
router.post('/buy-ticket', pay)
router.post('/create-ticket', createTicket)

module.exports = router