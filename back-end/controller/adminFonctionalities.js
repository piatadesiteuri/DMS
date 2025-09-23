const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const db = require('../db/db');
const nodemailer = require('nodemailer');
const session = require('express-session');
const route_admin = express.Router();
// Load dotenv configuration only in development
if (process.env.NODE_ENV !== 'production') {
    const dotenv = require('dotenv').config({ path: '.env.mailer' });
}

async function deleteUser(req, res) {
    const idd = req.body.e;
    db.dbDelUserById(idd);
}

async function acceptUser(req, res) {
    try {
        const transporter = nodemailer.createTransport({
            service: "Gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const id = req.body.e;
        const roles = req.body.roles;
        const upload = req.body.upload ? 1 : 0;
        const download = req.body.download ? 1 : 0;
        const print = req.body.print ? 1 : 0;
        const diffuse = req.body.diffuse ? 1 : 0;

        const results = await db.dbGetUserEmailById(id);

        if (!results.length) {
            return res.status(404).send('User not found');
        }

        await db.dbAddPrevileges(id, diffuse, upload, download, print, roles);
        const userEmail = results[0].email;

        // Simple confirmation URL without JWT
        const url = `${process.env.APP_URL || 'http://localhost:3000'}/confirmation/${id}`;

        await transporter.sendMail({
            to: userEmail,
            subject: 'Confirm Email',
            html: `Please click this email to confirm your email: <a href="${url}">${url}</a>`,
        });

        res.send('Confirmation email sent successfully');
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to send confirmation email');
    }
}

async function confirmationToken(token, Email) {
    try {
        console.log(Email);
        const decoded = jwt.verify(token, Email);
        const userId = decoded.user.id;
        await db.dbVerifyUserByID(userId);
        console.log('User verified successfully');
    } catch (err) {
        console.error(err);
    }
}

async function getUsers(req, res) {
    const results = await db.dbGetUnaceeptedUsers();
    res.json(results);
}

async function getInfo(req, res) {
    const results = await db.dbGetCount();
    res.json(results);
}

async function getAcceptedUsr(req, res) {
    const results = await db.dbGetAcceptedUsers();
    res.json(results);
}

async function UpdateUser(req) {
    console.log(req.body);
    db.dbAddPrevileges(req.body.e, req.body.diffuse, req.body.upload, req.body.download, req.body.print, req.body.roles);
}

async function admin(req, res) {
    try {
        if (!req.session || !req.session.id_user) {
            console.log("No session or user found");
            return res.status(401).json(null);
        }
        
        console.log("Session found:", req.session);
        const privileges = await db.dbPermaPrevileges(req.session.id_user);
        console.log("User privileges:", privileges);
        
        if (!req.session.role) {
            console.log("No role found in session");
            return res.status(401).json(null);
        }
        
        res.json(req.session.role);
    } catch (error) {
        console.error("Error in admin route:", error);
        res.status(500).json(null);
    }
}

async function blockUser(req, res) {
    try {
        const userId = req.body.userId;
        await db.dbBlockUser(userId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error blocking user:', error);
        res.status(500).json({ error: 'Failed to block user' });
    }
}

async function reactivateUser(req, res) {
    try {
        const id = req.body.e;
        const roles = req.body.roles;
        const upload = req.body.upload ? 1 : 0;
        const download = req.body.download ? 1 : 0;
        const print = req.body.print ? 1 : 0;
        const diffuse = req.body.diffuse ? 1 : 0;

        await db.dbAddPrevileges(id, diffuse, upload, download, print, roles);
        await db.dbVerifyUserByID(id); // This sets accepted = 1

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to reactivate user' });
    }
}

async function updateUser(req, res) {
    try {
        const { userId, diffuse, upload, download, print, roles } = req.body;
        await db.updateUserPermissions(userId, diffuse, upload, download, print, roles);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
}

exports.checkEmailExists = async (req, res) => {
  try {
    const { email } = req.query;
    const result = await db.checkEmailExists(email);
    res.json({ exists: result });
  } catch (error) {
    console.error('Error checking email:', error);
    res.status(500).json({ error: 'Error checking email' });
  }
};

module.exports = {
    getUsers: getUsers,
    deleteUser: deleteUser,
    acceptUser: acceptUser,
    confirmationToken: confirmationToken,
    getInfo: getInfo,
    getAcceptedUsr: getAcceptedUsr,
    UpdateUser: UpdateUser,
    admin: admin,
    blockUser: blockUser,
    reactivateUser: reactivateUser,
    updateUser: updateUser,
    checkEmailExists: exports.checkEmailExists
};
