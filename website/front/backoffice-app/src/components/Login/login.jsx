import "./Login.scss";
import {
    Button,
    Checkbox,
    Container,
    FormControlLabel,
    Grid,
    Paper,
    span,
} from "@mui/material";
import {
    MdLockOutline,
    MdOutlineLogin,
    MdOutlineErrorOutline,
} from "react-icons/md";
import { green } from "@mui/material/colors";
import Input from "../Input";
import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useCookies } from "react-cookie";
import { FcGoogle } from "react-icons/fc";
import { GoogleLogin } from "react-google-login";
import { loginService } from "../../services/login.service";
import { mailerService } from "../../services/mailer.service";
import Loading from "../Loading";
import zxcvbn from "zxcvbn";

const Login = ({ theme }) => {
    const navigate = useNavigate();

    const [cookies, setCookie, removeCookie] = useCookies(["token"]);

    const [formType, setFormType] = useState(true);
    const [loading, setLoading] = useState(false);

    const [username, setUsername] = useState({ value: "", msg: "" });
    const [email, setEmail] = useState({ value: "", msg: "" });
    const [password, setPassword] = useState({
        value: "",
        msg: "",
        strength: -1,
    });
    const [repeatPass, setRepeatPass] = useState({ value: "", msg: "" });
    const [rememberMe, setRememberMe] = useState(true);

    const strength = [
        "❌ Terribly bad",
        "🙁 Bad",
        "😕 Weak",
        "👍 Good",
        "💪 Strong",
    ];

    const checkEmailFormat = (value) =>
        String(value)
            .toLowerCase()
            .match(
                /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            );

    const checkUsername = async () => {
        if (username.value.length < 4)
            return setUsername({
                ...username,
                msg: "Length has to be in range (4 - 16)",
            });
        else if (!!/^[a-z0-9_]+$/.exec(username.value.toLowerCase()) === false)
            return setUsername({
                ...username,
                msg: "Username contains illegal characters",
            });

        const res = await loginService.checkUser({ username: username.value });
        if (res.data.success)
            return setUsername({ ...username, msg: "This username is taken" });

        return true;
    };

    const checkEmail = () => {
        if (email.value.length === 0)
            return setEmail({
                ...email,
                msg: "You have to provide email address",
            });
        else if (!checkEmailFormat(email.value))
            return setEmail({ ...email, msg: "Invalid email format" });
        return true;
    };

    const checkPassword = () => {
        if (password.value.length === 0)
            return setPassword({
                ...password,
                msg: "You have to provide password",
            });

        const res = zxcvbn(password.value);
        setPassword({ ...password, strength: res.score });
        if (res.score <= 1) return;

        return true;
    };

    const checkRepeatPass = () => {
        if (repeatPass.value.length === 0)
            return setRepeatPass({
                ...repeatPass,
                msg: "You have to repeat password",
            });
        if (password.value !== repeatPass.value)
            return setRepeatPass({
                ...repeatPass,
                msg: "Passwords don`t match!",
            });
        return true;
    };

    const checkEmailDatabase = async () => {
        console.log("email");
        if (checkEmail() !== true) return false;

        const res = await loginService.checkEmail({ email: email.value });

        if (res.data.success)
            setEmail({ ...email, msg: "This email is taken" });
        return !res.data.success;
    };

    const switchForm = () => {
        setFormType(!formType);
        setUsername({ ...username, msg: "" });
        setEmail({ ...email, msg: "" });
        setPassword({ ...password, msg: "" });
        setRepeatPass({ ...repeatPass, msg: "" });
    };

    const submitForm = async () => {
        setLoading(true);

        let flag = true;

        if (formType) {
            flag = checkEmail();
            flag = flag === true ? checkPassword() : false;

            if (flag) {
                const res = await loginService.loginUser({
                    email: email.value,
                    password: password.value,
                });

                if (res.data.success) {
                    setCookie("token", res.data.token, {
                        path: "/",
                        maxAge: rememberMe ? 2592000 : 3600,
                    });
                    window.location.reload(true);
                    navigate(`/account/`);
                } else setPassword({ ...password, msg: res.data.msg });
            }
        } else {
            flag = await checkUsername();
            flag = flag === true ? await checkEmailDatabase() : false;
            flag = flag === true ? checkPassword() : false;
            flag = flag === true ? checkRepeatPass() : false;

            if (flag) {
                const res = await mailerService.newPendingUser({
                    username: username.value,
                    email: email.value,
                    password: password.value,
                });

                if (res.data.success)
                    navigate(`/account/email_sent/${email.value}`);
            }
        }

        setLoading(false);
    };

    const responseGoogle = async (data) => {
        const res = await loginService.loginGoogleUser({
            email: data.profileObj.email,
            username: data.profileObj.name,
            imageUrl: data.profileObj.imageUrl,
            googleId: data.profileObj.googleId,
        });

        if (res.data.success) {
            setCookie("token", res.data.token, {
                path: "/",
                maxAge: rememberMe ? 2592000 : 3600,
            });
        }

        setPassword({ ...password, msg: res.data.msg });
    };

    loginService.checkSession({ token: cookies["token"] }).then((res) => {
        if (res.data.success) navigate("/account/");
    });

    return (
        <Container component="main" className="login" maxWidth="xs">
            <div className="login-paper drop-shadow-xl">
                {loading && <Loading />}
                <span className="text-[22px] font-bold">
                    {formType ? "Sign In" : "Sign Up"}
                </span>
                <div className="flex items-center gap-[3px] mt-[5px] select-none text-green-700">
                    <MdLockOutline size={20} />
                    <span fontSize="15px">Your data is protected.</span>
                </div>
                <Grid className="forms">
                    {!formType && (
                        <Grid className="message">
                            <Input
                                label="Username"
                                placeholder="Your username"
                                onChange={(e) =>
                                    setUsername({
                                        ...username,
                                        value: e.currentTarget.value,
                                        msg: "",
                                    })
                                }
                                inputProps={{ maxLength: 16 }}
                                error={username.msg.length > 0}
                                required
                                fullWidth
                                autoFocus
                            />
                            {username.msg.length > 0 && (
                                <Grid className="items">
                                    {" "}
                                    <MdOutlineErrorOutline /> {
                                        username.msg
                                    }{" "}
                                </Grid>
                            )}
                        </Grid>
                    )}
                    <Grid className="message">
                        <Input
                            label="Email Address"
                            placeholder="Your email"
                            onChange={(e) =>
                                setEmail({
                                    ...email,
                                    value: e.currentTarget.value,
                                    msg: "",
                                })
                            }
                            error={email.msg.length > 0}
                            required
                            fullWidth
                            autoFocus
                        />
                        {email.msg.length > 0 && (
                            <Grid className="items">
                                {" "}
                                <MdOutlineErrorOutline /> {email.msg}{" "}
                            </Grid>
                        )}
                    </Grid>
                    <Grid className="message">
                        <Input
                            val="password"
                            label="Password"
                            placeholder="Your password"
                            onKeyDown={(e) =>
                                `${e.code}`.toLowerCase() === "enter" &&
                                formType &&
                                submitForm()
                            }
                            onChange={(e) =>
                                setPassword({
                                    ...password,
                                    value: e.currentTarget.value,
                                    msg: "",
                                })
                            }
                            error={
                                password.msg.length > 0 ||
                                (password.strength !== -1 &&
                                    password.strength <= 1 &&
                                    password.value.length > 0)
                            }
                            required
                            fullWidth
                        />
                        {formType && (
                            <span
                                onClick={() =>
                                    navigate(
                                        `/account/forgot_password/${
                                            email.value ? email.value : ""
                                        }`
                                    )
                                }
                                className="forgot-password text-blue-500"
                            >
                                Forgot password?
                            </span>
                        )}
                        {formType && (
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={rememberMe}
                                        onChange={(e, newValue) =>
                                            setRememberMe(newValue)
                                        }
                                    />
                                }
                                label="Remember me"
                                className="remember_me"
                            />
                        )}
                        {!formType && password.value.length > 0 && (
                            <Grid sx={{ mt: "5px" }}>
                                <span sx={{ opacity: ".8" }}>
                                    {password.strength !== -1 &&
                                        strength[password.strength]}
                                </span>
                                <meter
                                    max={4}
                                    value={password.strength}
                                    className={`meter ${theme ? "dark" : ""}`}
                                />
                            </Grid>
                        )}
                        {password.msg.length > 0 && (
                            <Grid className="items">
                                {" "}
                                <MdOutlineErrorOutline /> {password.msg}{" "}
                            </Grid>
                        )}
                    </Grid>
                    {!formType && (
                        <Grid className="message">
                            <Input
                                val="password"
                                label="Repeat Password"
                                placeholder="Repeat password"
                                onChange={(e) =>
                                    setRepeatPass({
                                        ...repeatPass,
                                        value: e.currentTarget.value,
                                        msg: "",
                                    })
                                }
                                required
                                fullWidth
                                error={repeatPass.msg.length > 0}
                            />
                            {repeatPass.msg.length > 0 && (
                                <Grid className="items">
                                    {" "}
                                    <MdOutlineErrorOutline /> {
                                        repeatPass.msg
                                    }{" "}
                                </Grid>
                            )}
                        </Grid>
                    )}
                </Grid>
                <Grid className="buttons">
                    <Button
                        variant="contained"
                        startIcon={<MdOutlineLogin />}
                        onClick={() => submitForm()}
                        fullWidth
                    >
                        Sign {!formType ? `Up` : `In`}
                    </Button>
                    {formType && (
                        <GoogleLogin
                            clientId={process.env.REACT_APP_GOOGLE_CLIENTID}
                            render={(renderProps) => (
                                <Button
                                    onClick={renderProps.onClick}
                                    startIcon={<FcGoogle />}
                                    fullWidth
                                >
                                    Sign in with Google
                                </Button>
                            )}
                            onSuccess={responseGoogle}
                            onFailure={responseGoogle}
                            cookiePolicy="single_host_origin"
                        />
                    )}
                </Grid>
                <span className="text-below">
                    {formType
                        ? `Don't have an account yet?`
                        : `Already have an account?`}{" "}
                    <Button size="small" onClick={() => switchForm()}>
                        Sign {formType ? `Up` : `In`}
                    </Button>
                </span>
            </div>
        </Container>
    );
};

export default Login;
