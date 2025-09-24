import nodemailer from "nodemailer";
export const sendSecurityMail = async (email, user) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: `${process.env.MAIL_ID}`,
            pass: process.env.MAIL_PASSKEY
        }
    });

    const message = await transporter.sendMail({
        from: process.env.MAIL_ID,
        to: email,
        subject: "Secure Your Account",
        text: `Dear ${user},\n\nYour One-Time-Password(OTP) for verification is ${OTP}. Please enter this code within the
next 5 minutes to proceed.\n\nFor your security, do not share this OTP with anyone.\n\nThank you,\nRegards Connectrix`,
        html: `<h1 style="font-weight:800; text-align:center; font-size:3rem">Chemstock</h1>
    <p>Dear ${user},</p>
    <p>We hope this message finds you well. For your security, we have temporarily <i style="background: #e0e0e0; padding:0 0.3rem;">locked your account </i> &nbsp;due to multiple invalid login attempts.</p>
    <p>Our system detected three unsuccessful attempts to access your account, which prompted this precautionary measure to safeguard your personal information. As a result, your account has been locked for a duration of <b>12 hours</b>.</p>
    <p>If you believe this was an error or if you require immediate assistance, please contact our support team at <a href="mailto:${process.env.MAIL_ID}" rel="noopener noreferrer"> ${process.env.MAIL_ID}</a> or <a href="tel:919313052842" rel="noopener noreferrer">+91 9313052842</a>. We are here to help resolve any issues and ensure your account's security.</p>
    <p>To prevent future account lockouts, we recommend:</p>
    <ul>
        <li>Verifying your login credentials before attempting to log in.</li>
        <li>Resetting your password if you have forgotten it by clicking <a href="${process.env.FRONTEND_URL}/reset-password">Reset Password</a>.</li>
        <li>Contacting us immediately if you suspect any unauthorized activity.</li>
    </ul>
    <p>We apologize for any inconvenience this may cause and thank you for your understanding as we work to keep your account secure.</p>
    <p>Kind Regards</p>
    <p><b>Chemstock</b></p>`
    });
    let success;
    message.accepted.length > 0 ? success = true : success = false;

    return { success: success };
}
