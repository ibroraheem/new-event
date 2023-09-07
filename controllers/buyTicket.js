const axios = require('axios');
const nodemailer = require('nodemailer')
const { Category, Purchase, Payment } = require('../models/ticketCategory')

const MONNIFY_BASE_URL = 'https://sandbox.monnify.com/';
const API_KEY = 'MK_TEST_SS5CRWBRE9';
const SECRET_KEY = 'KTRVHGJWKPR7LZCS7YK1USLC5UCF2PGN'
const CONTRACT_CODE = '7404010886'
const key = Buffer.from(`${API_KEY}:${SECRET_KEY}`).toString('base64');

const getTickets = async (req, res) => {
    try {
        const tickets = await Category.find()
        res.status(200).json({ tickets })
    } catch (error) {
        res.status(500).json({ error })
    }
}

const initiatePaymentWithMonnify = async (amount, email) => {
    const endpoint = `${MONNIFY_BASE_URL}api/v1/merchant/transactions/init-transaction`;
    const data = {
        amount,
        customerEmail: email,
        paymentReference: generatePaymentReference(),
        contractCode: CONTRACT_CODE,
        redirectUrl: 'https://sandbox.sdk.monnify.com/checkout/MNFY|96|20230907062109|000072',
        paymentMethods: ["CARD", "ACCOUNT_TRANSFER"],
        currencyCode: "NGN",
    };

    const headers = {
        'Authorization': `Basic ${key}`,
        'Content-Type': 'application/json'
    };

    const response = await axios.post(endpoint, data, { headers });
    return response.data;
};


const pay = async (req, res) => {
    try {
        const { quantity, buyerName, email, phone } = req.body;
        if (!quantity || !buyerName || !email) throw new Error('Please provide all the required fields');
        const ticket = await Category.findOne({ id: req.params.id });
        if (!ticket) return res.status(404).json({ message: "Invalid Category" })
        const amount = ticket.price * quantity;
        const Response = await initiatePaymentWithMonnify(amount, email);
        JSON.stringify(Response)
        const paymentReference = Response.responseBody.paymentReference
        const checkoutUrl = Response.responseBody.checkoutUrl
        const newPayment = new Payment({
            reference: paymentReference,
            buyerName: buyerName,
            email: email,
            ticketId: ticket.id,
            quantity: quantity,
            amount: amount,
            phone: phone,
        });
        await newPayment.save();
        res.status(200).send(checkoutUrl)
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
};

async function handleWebhook(webhookData) {
    try {
        // 1. Validate the payment from webhookData
        if (webhookData.transactionStatus !== 'success') {
            console.log("Transaction not successful:", webhookData);
            return;
        }

        // 2. Fetch the corresponding Payment record from your database using the paymentReference
        const payment = await Payment.findOne({ reference: webhookData.paymentReference });
        if (!payment) {
            console.log("No matching payment record found for reference:", webhookData.paymentReference);
            return;
        }

        // 3. Use the payment details to buy the ticket
        const userPaymentDetails = {
            quantity: payment.quantity,
            buyerName: payment.buyerName,
            email: payment.email,
            phone: payment.phone,
            paymentReference: payment.reference,
            ticketId: ticket.id
        };
        await buyTicket({ body: userPaymentDetails });

        console.log("Ticket purchase successful for:", webhookData);

    } catch (error) {
        console.error("Error processing webhook:", error);
    }
}

const webhook = async (req, res) => {
    try {
        const webhookData = req.body;

        console.log("Received webhook data:", webhookData);

        if (webhookData.eventType === "SUCCESSFUL_TRANSACTION") {
            // Retrieve the expected payment details from the database using the payment reference
            const payment = await Payment.findOne({ reference: webhookData.eventData.paymentReference });

            // Validate the payment
            if (!payment) {
                console.error(`Payment with reference ${webhookData.eventData.paymentReference} not found`);
                return res.status(404).send("Payment not found");
            }

            // Check if the amount paid matches the expected amount
            if (payment.amount !== webhookData.eventData.amountPaid) {
                console.error(`Amount mismatch: expected ${payment.amount}, got ${webhookData.amount}`);
                return res.status(400).send("Amount mismatch");
            }

            // Execute the purchase logic
            await buyTicket(payment);
            payment.status = 'completed'
            await payment.save()
            
            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: process.env.EMAIL,
                    pass: process.env.PASSWORD,
                },
            })
            const mailOptions = {
                from: process.env.EMAIL,
                to: payment.email,
                subject: "Purchase Successful",
                html: ` <h2>Dear ${payment.buyerName},</h2>
                <p>Your purchase of Ticket for our event is successful </p>
                <p>Ticket Details:</p>
                <p>BookingID: ${payment.bookingId}
                `
            }
            res.status(200).send("Purchase successful");
        } else {
            console.warn("Payment was not successful. Not proceeding with purchase.");
            res.status(200).send("Payment not successful");
        }
    } catch (error) {
        console.error("Error handling Monnify webhook:", error);
        res.status(500).send("Error processing webhook");
    }
}



const buyTicket = async (payment) => {
    try {
        const { quantity, buyerName, email, phone, reference, ticketId } = payment;
        const ticket = await Category.findById(ticketId);
        const payId = await Payment.findOne({reference: reference})
        if (!ticket) {
            throw new Error("Invalid ticket category");
        }

        if (ticket.availableTickets < quantity) {
            throw new Error('Tickets Sold Out!');
        }

        const bookingId = Math.floor(Math.random() * 9000000) + 1000000;

        const newPurchase = new Purchase({
            category: ticket.name,
            quantity,
            buyerName,
            email,
            phone,
            paymentReference: reference,
            bookingId,
        });

        await newPurchase.save();
        payId.bookingId = bookingId
        await payId.save();
        ticket.availableTickets -= quantity;
        await ticket.save();
    } catch (error) {
        console.error("Error buying ticket:", error);
        throw error;  // re-throw the error so the calling function knows something went wrong
    }
}

const checkIn = async (req, res) => {
    try {
        const { bookingId } = req.body
        const ticket = await Purchase.findOne({ bookingId })
        if (!ticket) return res.status(404).json({ error: 'Booking not found' })
        ticket.checkedIn = true
        await ticket.save()
        res.status(200).json({ message: 'Check-in successful', Category: ticket.category, name: ticket.buyerName })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message })
    }
}

const getBookings = async (req, res) => {
    try {
        const bookings = await Purchase.find()
        res.status(200).json({ bookings })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

const createTicket = async (req, res) => {
    try {
        const { name, price, availableTickets } = req.body
        if (!name || !price || !availableTickets) return res.status(403).json({ Message: "Fill all fields" })
        if ((isNaN(+price)) || (+price < 0) || isNaN(+availableTickets)) {
            return res.status(406).json({ "Error": "Price and tickets must be numbers" })
        }
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) return res.status(403).json({ message: "Duplicate category" })
        if ((+availableTickets) < 1) {
            return res.status(409).json({ "Message": "Not enough tickets in stock" });
        }
        const newCategory = new Category({
            name: name,
            price: price,
            availableTickets: availableTickets
        })
        await newCategory.save();
        res.status(200).json({ message: "created succesfully", newCategory })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message })
    }
}
const generatePaymentReference = () => {
    return Math.random().toString(36).substring(2, 15) + Date.now();
};
module.exports = { getTickets, checkIn, getBookings, webhook, pay, createTicket }