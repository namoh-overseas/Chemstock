import nodemailer from "nodemailer";
import cryptoRandomString from "crypto-random-string";
export const sendEmailVerificationOTP = async (email, user) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.MAIL_ID,
            pass: process.env.MAIL_PASSKEY
        }
    });

    const OTP = cryptoRandomString({length: 6, type: "numeric"});
    const message = await transporter.sendMail({
        from: process.env.MAIL_ID,
        to: email,
        subject: "Email Verification OTP",
        text: `Dear ${user},\n\nYour One-Time-Password(OTP) for verification is ${OTP}. Please enter this code within the next 5 minutes to proceed.\n\nFor your security, do not share this OTP with anyone.\n\nThank you,\nRegards Chemstock`,
        html: `<h1 style='margin:auto;width:fit-content;font-weight:700;'>Chemstock</h1><p>Dear ${user},<br /><br />Your One-Time-Password(OTP) for verification is <b>${OTP}</b>. Please enter this code within the next 5 minutes to proceed.<br /> <br />For your security, do not share this OTP with anyone.<br /><br />Thank you,<br />Regards<br /><b>Chemstock</b></p>`,
        sender: process.env.MAIL_ID,
    });
    let success;
    message.accepted.length > 0 ? success = true : success = false;

    return { otp: OTP, success: success };
}
