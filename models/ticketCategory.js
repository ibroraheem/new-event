const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    availableTickets: {
        type: Number,

    }
}, { timestamps: true })

const Category = mongoose.model('Category', CategorySchema)

const PurchaseSchema = mongoose.Schema({
    buyerName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    paymentReference: {
        type: String,
        required: true,
    },
    category:{
        type: String,
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
    },
    bookingId: {
        type: String,
        required: true,
    },
    checkedIn: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true })

const Purchase = mongoose.model('Purchase', PurchaseSchema)

const PaymentReference = new mongoose.Schema({
    buyerName: {
        type: String,
        required: true,
    },
    reference: {
        type: String,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    quantity: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['initiated', 'completed'],
        default: 'initiated'
    },
    email: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    ticketId: {
        type: String,
        required: true,
    }
}, { timestamps: true })

const Payment = mongoose.model('Payment', PaymentReference)

module.exports = { Category, Purchase, Payment }