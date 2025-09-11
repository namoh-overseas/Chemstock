import nodemailer from "nodemailer";
import cryptoRandomString from "crypto-random-string";
export const sendPasswordResetMail = async (email, user, id) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: `${process.env.MAIL_ID}`,
            pass: process.env.MAIL_PASSKEY
        }
    });

    const token = cryptoRandomString({length: 32, type: "url-safe"});
    const message = await transporter.sendMail({
        from: process.env.MAIL_ID,
        to: email,
        subject: "Reset Your Password",
        text: `Dear ${user},\n\nYour password reset link is ${process.env.FRONTEND_URL}/reset-password?user=${id}&resetToken=${token}. Please enter this code within the next 5 minutes to proceed.\n\nFor your security, do not share this OTP with anyone.\n\nThank you,\nRegards Chemstock`,
        html: `<h1 style="font-weight:800; text-align:center; font-size:3rem">Chemstock</h1>
    <p>Dear ${user},</p>
    <p>We received a request to reset the password associated with your account. If you initiated this request, please follow the instructions below to <i style="background: #e0e0e0; padding:0 0.3rem;">reset your password</i>.</p>
    <p><b>Reset Password Instructions:</b></p>
    <ol>
        <li>Click on the link below to reset your password: <br /><a href="${process.env.FRONTEND_URL}/reset-password?user=${id}&resetToken=${token}" rel="noopener noreferrer">Reset Password</a></li><br/>
        <li>Follow the prompts to create a new password.</li>
    </ol>
    <p>Please note that this link will expire in <b>10 mins </b>for your security.</p>
    <p>If you did not request a password reset, no further action is required. However, we recommend reviewing your account activity and ensuring your information is secure. Contact us immediately at <a href="mailto:${process.env.MAIL_ID}" rel="noopener noreferrer"> ${process.env.MAIL_ID}</a> or <a href="tel:919313052842" rel="noopener noreferrer">+91 9313052842</a> if you notice any suspicious activity.</p>
    <p>For best practices, please choose a strong password containing a mix of uppercase letters, lowercase letters, numbers, and special characters.</p>
    <p>We are here to assist you if you encounter any issues during the process.</p>
    <p>Kind Regards</p>
    <p><b>Chemstock</b></p>`,
        sender: process.env.MAIL_ID,
    });
    let success;
    message.accepted.length > 0 ? success = true : success = false;

    return { token, success };
}
