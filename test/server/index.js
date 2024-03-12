/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */
require("dotenv").config();
let SuperTokens = require("supertokens-node");
let { default: SuperTokensRaw } = require("supertokens-node/lib/build/supertokens");
const { default: EmailVerificationRaw } = require("supertokens-node/lib/build/recipe/emailverification/recipe");
const { default: EmailPasswordRaw } = require("supertokens-node/lib/build/recipe/emailpassword/recipe");
const { default: ThirdPartyRaw } = require("supertokens-node/lib/build/recipe/thirdparty/recipe");
const {
    default: ThirdPartyEmailPasswordRaw,
} = require("supertokens-node/lib/build/recipe/thirdpartyemailpassword/recipe");
const { default: SessionRaw } = require("supertokens-node/lib/build/recipe/session/recipe");
let Session = require("supertokens-node/recipe/session");
let EmailPassword = require("supertokens-node/recipe/emailpassword");
let ThirdParty = require("supertokens-node/recipe/thirdparty");
let EmailVerification = require("supertokens-node/recipe/emailverification");
let ThirdPartyEmailPassword = require("supertokens-node/recipe/thirdpartyemailpassword");
let { verifySession } = require("supertokens-node/recipe/session/framework/express");
let { middleware, errorHandler } = require("supertokens-node/framework/express");
let express = require("express");
let cookieParser = require("cookie-parser");
let bodyParser = require("body-parser");
let http = require("http");
let cors = require("cors");
const morgan = require("morgan");
let {
    startST,
    killAllST,
    setupST,
    cleanST,
    setKeyValueInConfig,
    customAuth0Provider,
    maxVersion,
    stopST,
    mockThirdPartyProvider,
} = require("./utils");
let { version: nodeSDKVersion } = require("supertokens-node/lib/build/version");
const fetch = require("isomorphic-fetch");

let passwordlessSupported;
let PasswordlessRaw;
let Passwordless;

try {
    PasswordlessRaw = require("supertokens-node/lib/build/recipe/passwordless/recipe").default;
    Passwordless = require("supertokens-node/recipe/passwordless");
    passwordlessSupported = true;
} catch (ex) {
    passwordlessSupported = false;
}

let thirdPartyPasswordlessSupported;
let ThirdPartyPasswordlessRaw;
let ThirdPartyPasswordless;

try {
    ThirdPartyPasswordlessRaw = require("supertokens-node/lib/build/recipe/thirdpartypasswordless/recipe").default;
    ThirdPartyPasswordless = require("supertokens-node/recipe/thirdpartypasswordless");
    thirdPartyPasswordlessSupported = true;
} catch (ex) {
    thirdPartyPasswordlessSupported = false;
}

try {
    UserRolesRaw = require("supertokens-node/lib/build/recipe/userroles/recipe").default;
    UserRoles = require("supertokens-node/recipe/userroles");
    userRolesSupported = true;
} catch (ex) {
    userRolesSupported = false;
}

let Multitenancy, MultitenancyRaw, multitenancySupported;
try {
    MultitenancyRaw = require("supertokens-node/lib/build/recipe/multitenancy/recipe").default;
    Multitenancy = require("supertokens-node/lib/build/recipe/multitenancy");
    multitenancySupported = true;
} catch {
    multitenancySupported = false;
}

let AccountLinking, AccountLinkingRaw, accountLinkingSupported;
try {
    AccountLinkingRaw = require("supertokens-node/lib/build/recipe/accountlinking/recipe").default;
    AccountLinking = require("supertokens-node/recipe/accountlinking");
    accountLinkingSupported = true;
} catch (ex) {
    accountLinkingSupported = false;
}

/** @type {import("supertokens-node/recipe/usermetadata").default | undefined} */
let UserMetadata;
let UserMetadataRaw, userMetadataSupported;
try {
    UserMetadataRaw = require("supertokens-node/lib/build/recipe/usermetadata/recipe").default;
    UserMetadata = require("supertokens-node/recipe/usermetadata");
    userMetadataSupported = true;
} catch (ex) {
    userMetadataSupported = false;
}

/** @type {import("supertokens-node/recipe/multifactorauth").default | undefined} */
let MultiFactorAuth;
let MultiFactorAuthRaw, multiFactorAuthSupported;
try {
    MultiFactorAuthRaw = require("supertokens-node/lib/build/recipe/multifactorauth/recipe").default;
    MultiFactorAuth = require("supertokens-node/recipe/multifactorauth");
    multiFactorAuthSupported = true;
} catch (ex) {
    multiFactorAuthSupported = false;
}

/** @type {import("supertokens-node/recipe/totp").default | undefined} */
let TOTP;
let TOTPRaw, totpSupported;
try {
    TOTPRaw = require("supertokens-node/lib/build/recipe/totp/recipe").default;
    TOTP = require("supertokens-node/recipe/totp");
    totpSupported = true;
} catch (ex) {
    totpSupported = false;
}
const OTPAuth = require("otpauth");

let generalErrorSupported;

if (maxVersion(nodeSDKVersion, "9.9.9") === "9.9.9") {
    // General error is only supported by 10.0.0 and above
    generalErrorSupported = false;
} else {
    generalErrorSupported = true;
}

const fullProviderList = [
    {
        config: {
            thirdPartyId: "google",
            clients: [
                {
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                    clientId: process.env.GOOGLE_CLIENT_ID,
                },
            ],
        },
    },
    {
        config: {
            thirdPartyId: "github",
            clients: [
                {
                    clientSecret: process.env.GITHUB_CLIENT_SECRET,
                    clientId: process.env.GITHUB_CLIENT_ID,
                },
            ],
        },
    },
    {
        config: {
            thirdPartyId: "facebook",
            clients: [
                {
                    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
                    clientId: process.env.FACEBOOK_CLIENT_ID,
                },
            ],
        },
    },
    customAuth0Provider(),
    mockThirdPartyProvider,
];

let urlencodedParser = bodyParser.urlencoded({ limit: "20mb", extended: true, parameterLimit: 20000 });
let jsonParser = bodyParser.json({ limit: "20mb" });

let app = express();

const originalSend = app.response.send;
app.response.send = function sendOverWrite(body) {
    originalSend.call(this, body);
    this.__custombody__ = body;
};

morgan.token("body", function (req, res) {
    return JSON.stringify(req.body);
});

morgan.token("res-body", function (req, res) {
    return typeof res.__custombody__ === "string" ? res.__custombody__ : JSON.stringify(res.__custombody__);
});

app.use(urlencodedParser);
app.use(jsonParser);

app.use(morgan("[:date[iso]] :url :method :body", { immediate: true }));
app.use(morgan("[:date[iso]] :url :method :status :response-time ms - :res[content-length] :res-body"));

app.use(cookieParser());

const WEB_PORT = process.env.WEB_PORT || 3031;
const websiteDomain = `http://localhost:${WEB_PORT}`;
let latestURLWithToken = "";

let deviceStore = new Map();
function saveCode({ email, phoneNumber, preAuthSessionId, urlWithLinkCode, userInputCode }) {
    console.log(arguments[0]);
    const device = deviceStore.get(preAuthSessionId) || {
        preAuthSessionId,
        codes: [],
    };
    device.codes.push({
        urlWithLinkCode,
        userInputCode,
    });
    deviceStore.set(preAuthSessionId, device);
}
const formFields = (process.env.MIN_FIELDS && []) || [
    {
        id: "name",
    },
    {
        id: "age",
        validate: async (value) => {
            if (parseInt(value) < 18) {
                return "You must be over 18 to register";
            }

            // If no error, return undefined.
            return undefined;
        },
    },
    {
        id: "country",
        optional: true,
    },
];

let connectionURI = "http://localhost:9000";
let passwordlessConfig = {};
let accountLinkingConfig = {};
let enabledProviders = undefined;
let enabledRecipes = undefined;
let mfaInfo = {};

initST();

app.use(
    cors({
        origin: websiteDomain,
        allowedHeaders: ["content-type", ...SuperTokens.getAllCORSHeaders()],
        methods: ["GET", "PUT", "POST", "DELETE"],
        credentials: true,
    })
);

app.use(middleware());

app.get("/ping", async (req, res) => {
    res.send("success");
});

app.post("/startst", async (req, res) => {
    try {
        connectionURI = await startST(req.body);
        console.log("Connection URI: " + connectionURI);
        const OPAQUE_KEY_WITH_ALL_FEATURES_ENABLED =
            "N2yITHflaFS4BPm7n0bnfFCjP4sJoTERmP0J=kXQ5YONtALeGnfOOe2rf2QZ0mfOh0aO3pBqfF-S0jb0ABpat6pySluTpJO6jieD6tzUOR1HrGjJO=50Ob3mHi21tQHJ";

        await fetch(`${connectionURI}/ee/license`, {
            method: "PUT",
            headers: {
                "content-type": "application/json; charset=utf-8",
            },
            body: JSON.stringify({
                licenseKey: OPAQUE_KEY_WITH_ALL_FEATURES_ENABLED,
            }),
        });
        initST();
        res.send(connectionURI + "");
    } catch (err) {
        console.log(err);
        res.status(500).send(err.toString());
    }
});

app.post("/beforeeach", async (req, res) => {
    deviceStore = new Map();

    mfaInfo = {};
    accountLinkingConfig = {};
    passwordlessConfig = {};
    enabledProviders = undefined;
    enabledRecipes = undefined;

    await killAllST();
    await setupST();
    initST();
    res.send();
});

app.post("/after", async (req, res) => {
    await killAllST();
    await cleanST();
    res.send();
});

app.post("/stopst", async (req, res) => {
    await stopST(req.body.pid);
    res.send("");
});

// custom API that requires session verification
app.get("/sessioninfo", verifySession(), async (req, res, next) => {
    let session = req.session;
    const accessTokenPayload =
        session.getJWTPayload !== undefined ? session.getJWTPayload() : session.getAccessTokenPayload();

    try {
        const sessionData = session.getSessionData
            ? await session.getSessionData()
            : await session.getSessionDataFromDatabase();
        res.send({
            sessionHandle: session.getHandle(),
            userId: session.getUserId(),
            recipeUserId: accountLinkingSupported ? session.getRecipeUserId().getAsString() : session.getUserId(),
            accessTokenPayload,
            sessionData,
        });
    } catch (err) {
        next(err);
    }
});

app.post("/deleteUser", async (req, res) => {
    if (!accountLinkingSupported) {
        const user = await EmailPassword.getUserByEmail("public", req.body.email);
        return res.send(await SuperTokens.deleteUser(user.id));
    }

    const users = await SuperTokens.listUsersByAccountInfo("public", req.body);
    res.send(await SuperTokens.deleteUser(users[0].id));
});

app.post("/changeEmail", async (req, res) => {
    let resp;
    if (req.body.rid === "emailpassword") {
        resp = await EmailPassword.updateEmailOrPassword({
            recipeUserId: convertToRecipeUserIdIfAvailable(req.body.recipeUserId),
            email: req.body.email,
            tenantIdForPasswordPolicy: req.body.tenantId,
        });
    } else if (req.body.rid === "thirdparty") {
        const user = await SuperTokens.getUser({ userId: req.body.recipeUserId });
        const loginMethod = user.loginMethod.find((lm) => lm.recipeUserId.getAsString() === req.body.recipeUserId);
        resp = await ThirdParty.manuallyCreateOrUpdateUser(
            req.body.tenantId,
            loginMethod.thirdParty.id,
            loginMethod.thirdParty.userId,
            req.body.email,
            false
        );
    } else if (req.body.rid === "passwordless") {
        resp = await Passwordless.updateUser({
            recipeUserId: convertToRecipeUserIdIfAvailable(req.body.recipeUserId),
            email: req.body.email,
            phoneNumber: req.body.phoneNumber,
        });
    }
    res.json(resp);
});

app.get("/unverifyEmail", verifySession(), async (req, res) => {
    let session = req.session;
    await EmailVerification.unverifyEmail(accountLinkingSupported ? session.getRecipeUserId() : session.getUserId());
    await session.fetchAndSetClaim(EmailVerification.EmailVerificationClaim, {});
    res.send({ status: "OK" });
});

app.post("/setRole", verifySession(), async (req, res) => {
    let session = req.session;
    await UserRoles.createNewRoleOrAddPermissions(req.body.role, req.body.permissions);
    await UserRoles.addRoleToUser(session.getTenantId(), session.getUserId(), req.body.role);
    await session.fetchAndSetClaim(UserRoles.UserRoleClaim, {});
    await session.fetchAndSetClaim(UserRoles.PermissionClaim, {});
    res.send({ status: "OK" });
});

app.post(
    "/checkRole",
    verifySession({
        overrideGlobalClaimValidators: async (gv, _session, userContext) => {
            const res = [...gv];
            const body = await userContext._default.request.getJSONBody();
            if (body.role !== undefined) {
                const info = body.role;
                res.push(UserRoles.UserRoleClaim.validators[info.validator](...info.args));
            }

            if (body.permission !== undefined) {
                const info = body.permission;
                res.push(UserRoles.PermissionClaim.validators[info.validator](...info.args));
            }
            return res;
        },
    }),
    async (req, res) => {
        res.send({ status: "OK" });
    }
);

app.post("/setMFAInfo", async (req, res) => {
    mfaInfo = req.body;

    res.send({ status: "OK" });
});

app.post("/completeFactor", verifySession(), async (req, res) => {
    let session = req.session;

    await MultiFactorAuth.markFactorAsCompleteInSession(session, req.body.id);

    res.send({ status: "OK" });
});

app.post("/addRequiredFactor", verifySession(), async (req, res) => {
    let session = req.session;

    await MultiFactorAuth.addToRequiredSecondaryFactorsForUser(session.getUserId(), req.body.factorId);

    res.send({ status: "OK" });
});

app.post("/mergeIntoAccessTokenPayload", verifySession(), async (req, res) => {
    let session = req.session;

    await session.mergeIntoAccessTokenPayload(req.body);

    res.send({ status: "OK" });
});

app.get("/token", async (_, res) => {
    res.send({
        latestURLWithToken,
    });
});

app.post("/setupTenant", async (req, res) => {
    const { tenantId, loginMethods, coreConfig } = req.body;
    let coreResp = await Multitenancy.createOrUpdateTenant(tenantId, {
        emailPasswordEnabled: loginMethods.emailPassword?.enabled === true,
        thirdPartyEnabled: loginMethods.thirdParty?.enabled === true,
        passwordlessEnabled: loginMethods.passwordless?.enabled === true,
        coreConfig,
    });

    if (loginMethods.thirdParty.providers !== undefined) {
        for (const provider of loginMethods.thirdParty.providers) {
            await Multitenancy.createOrUpdateThirdPartyConfig(tenantId, provider);
        }
    }
    res.send(coreResp);
});

app.post("/addUserToTenant", async (req, res) => {
    const { tenantId, recipeUserId } = req.body;
    let coreResp = await Multitenancy.associateUserToTenant(tenantId, convertToRecipeUserIdIfAvailable(recipeUserId));
    res.send(coreResp);
});

app.post("/removeUserFromTenant", async (req, res) => {
    const { tenantId, recipeUserId } = req.body;
    let coreResp = await Multitenancy.disassociateUserFromTenant(
        tenantId,
        convertToRecipeUserIdIfAvailable(recipeUserId)
    );
    res.send(coreResp);
});

app.post("/removeTenant", async (req, res) => {
    const { tenantId } = req.body;
    let coreResp = await Multitenancy.deleteTenant(tenantId);
    res.send(coreResp);
});

app.post("/test/setFlow", (req, res) => {
    passwordlessConfig = {
        contactMethod: req.body.contactMethod,
        flowType: req.body.flowType,

        emailDelivery: {
            override: (oI) => {
                return {
                    ...oI,
                    sendEmail: saveCode,
                };
            },
        },
        smsDelivery: {
            override: (oI) => {
                return {
                    ...oI,
                    sendSms: saveCode,
                };
            },
        },
    };
    initST();
    res.sendStatus(200);
});

app.post("/test/setAccountLinkingConfig", (req, res) => {
    accountLinkingConfig = {
        ...req.body,
    };
    initST();
    res.sendStatus(200);
});

app.post("/test/setEnabledRecipes", (req, res) => {
    enabledRecipes = req.body.enabledRecipes;
    enabledProviders = req.body.enabledProviders;
    initST();
    res.sendStatus(200);
});

app.get("/test/getDevice", (req, res) => {
    res.send(deviceStore.get(req.query.preAuthSessionId));
});

app.post("/test/getTOTPCode", (req, res) => {
    res.send(JSON.stringify({ totp: new OTPAuth.TOTP({ secret: req.body.secret, digits: 6, period: 1 }).generate() }));
});

app.get("/test/featureFlags", (req, res) => {
    const available = [];

    if (passwordlessSupported) {
        available.push("passwordless");
    }

    if (thirdPartyPasswordlessSupported) {
        available.push("thirdpartypasswordless");
    }

    if (generalErrorSupported) {
        available.push("generalerror");
    }

    if (userRolesSupported) {
        available.push("userroles");
    }

    if (multitenancySupported) {
        available.push("multitenancy");
        available.push("multitenancyManagementEndpoints");
    }

    if (accountLinkingSupported) {
        available.push("accountlinking");
    }

    if (multiFactorAuthSupported) {
        available.push("mfa");
    }

    available.push("recipeConfig");

    res.send({
        available,
    });
});

app.use(errorHandler());

app.use(async (err, req, res, next) => {
    try {
        console.error(err);
        res.status(500).send(err);
    } catch (ignored) {}
});

let server = http.createServer(app);
server.listen(process.env.NODE_PORT === undefined ? 8080 : process.env.NODE_PORT, "0.0.0.0");

/*
 * Setup and start the core when running the test application when running with  the following command:
 * START=true TEST_MODE=testing INSTALL_PATH=../../../supertokens-root NODE_PORT=8082 node .
 * or
 * npm run server
 */
(async function (shouldSpinUp) {
    if (shouldSpinUp) {
        console.log(`Start supertokens for test app`);
        try {
            await killAllST();
            await cleanST();
        } catch (e) {}

        await setupST();
        connectionURI = await startST();
        console.log("Connection URI: " + connectionURI);
    }
})(process.env.START === "true");

function initST() {
    if (process.env.TEST_MODE) {
        mfaInfo = {};
        if (userRolesSupported) {
            UserRolesRaw.reset();
        }

        if (thirdPartyPasswordlessSupported) {
            ThirdPartyPasswordlessRaw.reset();
        }

        if (passwordlessSupported) {
            PasswordlessRaw.reset();
        }

        if (multitenancySupported) {
            MultitenancyRaw.reset();
        }

        if (accountLinkingSupported) {
            AccountLinkingRaw.reset();
        }

        if (userMetadataSupported) {
            UserMetadataRaw.reset();
        }

        if (multiFactorAuthSupported) {
            MultiFactorAuthRaw.reset();
        }

        if (totpSupported) {
            TOTPRaw.reset();
        }

        EmailVerificationRaw.reset();
        EmailPasswordRaw.reset();
        ThirdPartyRaw.reset();
        ThirdPartyEmailPasswordRaw.reset();
        SessionRaw.reset();

        SuperTokensRaw.reset();
    }

    const recipeList = [
        [
            "emailverification",
            EmailVerification.init({
                mode: "OPTIONAL",
                emailDelivery: {
                    override: (oI) => {
                        return {
                            ...oI,
                            sendEmail: async (input) => {
                                latestURLWithToken = input.emailVerifyLink;
                            },
                        };
                    },
                },
                override: {
                    apis: (oI) => {
                        return {
                            ...oI,
                            generateEmailVerifyTokenPOST: async function (input) {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API email verification code",
                                    };
                                }
                                return oI.generateEmailVerifyTokenPOST(input);
                            },
                            verifyEmailPOST: async function (input) {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API email verify",
                                    };
                                }
                                return oI.verifyEmailPOST(input);
                            },
                        };
                    },
                },
            }),
        ],
        [
            "emailpassword",
            EmailPassword.init({
                override: {
                    apis: (oI) => {
                        return {
                            ...oI,
                            passwordResetPOST: async function (input) {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API reset password consume",
                                    };
                                }
                                return oI.passwordResetPOST(input);
                            },
                            generatePasswordResetTokenPOST: async function (input) {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API reset password",
                                    };
                                }
                                return oI.generatePasswordResetTokenPOST(input);
                            },
                            emailExistsGET: async function (input) {
                                let generalError = input.options.req.getKeyValueFromQuery("generalError");
                                if (generalError === "true") {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API email exists",
                                    };
                                }
                                return oI.emailExistsGET(input);
                            },
                            signUpPOST: async function (input) {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API sign up",
                                    };
                                }
                                return oI.signUpPOST(input);
                            },
                            signInPOST: async function (input) {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    let message = "general error from API sign in";

                                    if (body.generalErrorMessage !== undefined) {
                                        message = body.generalErrorMessage;
                                    }

                                    return {
                                        status: "GENERAL_ERROR",
                                        message,
                                    };
                                }
                                return oI.signInPOST(input);
                            },
                        };
                    },
                },
                signUpFeature: {
                    formFields,
                },
                emailDelivery: {
                    override: (oI) => {
                        return {
                            ...oI,
                            sendEmail: async (input) => {
                                console.log(input.passwordResetLink);
                                latestURLWithToken = input.passwordResetLink;
                            },
                        };
                    },
                },
            }),
        ],
        [
            "thirdparty",
            ThirdParty.init({
                signInAndUpFeature: {
                    providers:
                        enabledProviders !== undefined
                            ? fullProviderList.filter(({ config }) => enabledProviders.includes(config.thirdPartyId))
                            : fullProviderList,
                },
                override: {
                    apis: (originalImplementation) => {
                        return {
                            ...originalImplementation,
                            authorisationUrlGET: async function (input) {
                                let generalErrorFromQuery = input.options.req.getKeyValueFromQuery("generalError");
                                if (generalErrorFromQuery === "true") {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API authorisation url get",
                                    };
                                }

                                return originalImplementation.authorisationUrlGET(input);
                            },
                            signInUpPOST: async function (input) {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API sign in up",
                                    };
                                }

                                return originalImplementation.signInUpPOST(input);
                            },
                        };
                    },
                },
            }),
        ],
        [
            "thirdpartyemailpassword",
            ThirdPartyEmailPassword.init({
                signUpFeature: {
                    formFields,
                },
                emailDelivery: {
                    override: (oI) => {
                        return {
                            ...oI,
                            sendEmail: async (input) => {
                                console.log(input.passwordResetLink);
                                latestURLWithToken = input.passwordResetLink;
                            },
                        };
                    },
                },
                providers:
                    enabledProviders !== undefined
                        ? fullProviderList.filter((config) => enabledProviders.includes(config.config))
                        : fullProviderList,
                override: {
                    apis: (originalImplementation) => {
                        return {
                            ...originalImplementation,
                            emailPasswordSignUpPOST: async function (input) {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API sign up",
                                    };
                                }

                                return originalImplementation.emailPasswordSignUpPOST(input);
                            },
                            passwordResetPOST: async function (input) {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API reset password consume",
                                    };
                                }
                                return originalImplementation.passwordResetPOST(input);
                            },
                            generatePasswordResetTokenPOST: async function (input) {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API reset password",
                                    };
                                }
                                return originalImplementation.generatePasswordResetTokenPOST(input);
                            },
                            emailPasswordEmailExistsGET: async function (input) {
                                let generalError = input.options.req.getKeyValueFromQuery("generalError");
                                if (generalError === "true") {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API email exists",
                                    };
                                }
                                return originalImplementation.emailPasswordEmailExistsGET(input);
                            },
                            emailPasswordSignInPOST: async function (input) {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API sign in",
                                    };
                                }
                                return originalImplementation.emailPasswordSignInPOST(input);
                            },
                            authorisationUrlGET: async function (input) {
                                let generalErrorFromQuery = input.options.req.getKeyValueFromQuery("generalError");
                                if (generalErrorFromQuery === "true") {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API authorisation url get",
                                    };
                                }

                                return originalImplementation.authorisationUrlGET(input);
                            },
                            thirdPartySignInUpPOST: async function (input) {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API sign in up",
                                    };
                                }

                                return originalImplementation.thirdPartySignInUpPOST(input);
                            },
                        };
                    },
                },
            }),
        ],
        [
            "session",
            Session.init({
                overwriteSessionDuringSignIn: true,
                override: {
                    apis: function (originalImplementation) {
                        return {
                            ...originalImplementation,
                            signOutPOST: async (input) => {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from signout API",
                                    };
                                }
                                return originalImplementation.signOutPOST(input);
                            },
                        };
                    },
                },
            }),
        ],
    ];

    passwordlessConfig = {
        contactMethod: "EMAIL_OR_PHONE",
        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
        emailDelivery: {
            override: (oI) => {
                return {
                    ...oI,
                    sendEmail: saveCode,
                };
            },
        },
        smsDelivery: {
            override: (oI) => {
                return {
                    ...oI,
                    sendSms: saveCode,
                };
            },
        },
        ...passwordlessConfig,
    };
    if (passwordlessSupported) {
        recipeList.push([
            "passwordless",
            Passwordless.init({
                ...passwordlessConfig,
                override: {
                    apis: (originalImplementation) => {
                        return {
                            ...originalImplementation,
                            createCodePOST: async function (input) {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API create code",
                                    };
                                }
                                return originalImplementation.createCodePOST(input);
                            },
                            resendCodePOST: async function (input) {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API resend code",
                                    };
                                }
                                return originalImplementation.resendCodePOST(input);
                            },
                            consumeCodePOST: async function (input) {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API consume code",
                                    };
                                }

                                const resp = await originalImplementation.consumeCodePOST(input);

                                return resp;
                            },
                        };
                    },
                },
            }),
        ]);
    }

    if (thirdPartyPasswordlessSupported) {
        recipeList.push([
            "thirdpartypasswordless",
            ThirdPartyPasswordless.init({
                ...passwordlessConfig,
                providers:
                    enabledProviders !== undefined
                        ? fullProviderList.filter((config) => enabledProviders.includes(config.config))
                        : fullProviderList,
                override: {
                    apis: (originalImplementation) => {
                        return {
                            ...originalImplementation,
                            authorisationUrlGET: async function (input) {
                                let generalErrorFromQuery = input.options.req.getKeyValueFromQuery("generalError");
                                if (generalErrorFromQuery === "true") {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API authorisation url get",
                                    };
                                }

                                return originalImplementation.authorisationUrlGET(input);
                            },
                            thirdPartySignInUpPOST: async function (input) {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API sign in up",
                                    };
                                }

                                return originalImplementation.thirdPartySignInUpPOST(input);
                            },
                            createCodePOST: async function (input) {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API create code",
                                    };
                                }
                                return originalImplementation.createCodePOST(input);
                            },
                            resendCodePOST: async function (input) {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API resend code",
                                    };
                                }
                                return originalImplementation.resendCodePOST(input);
                            },
                            consumeCodePOST: async function (input) {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API consume code",
                                    };
                                }
                                return originalImplementation.consumeCodePOST(input);
                            },
                        };
                    },
                },
            }),
        ]);
    }

    if (userRolesSupported) {
        recipeList.push(["userroles", UserRoles.init()]);
    }

    if (multitenancySupported) {
        recipeList.push([
            "multitenancy",
            Multitenancy.init({
                getAllowedDomainsForTenantId: (tenantId) => [
                    `${tenantId}.example.com`,
                    websiteDomain.replace(/https?:\/\/([^:\/]*).*/, "$1"),
                ],
            }),
        ]);
    }

    accountLinkingConfig = {
        enabled: false,
        shouldAutoLink: {
            ...accountLinkingConfig?.shouldAutoLink,
            shouldAutomaticallyLink: true,
            shouldRequireVerification: true,
        },
        ...accountLinkingConfig,
    };
    if (accountLinkingSupported) {
        if (accountLinkingConfig.enabled) {
            recipeList.push([
                "accountlinking",
                AccountLinking.init({
                    shouldDoAutomaticAccountLinking: () => ({
                        ...accountLinkingConfig.shouldAutoLink,
                    }),
                }),
            ]);
        }
    }
    if (multiFactorAuthSupported) {
        recipeList.push([
            "multifactorauth",
            MultiFactorAuth.init({
                firstFactors: mfaInfo.firstFactors,
                override: {
                    functions: (oI) => ({
                        ...oI,
                        getFactorsSetupForUser: async (input) => {
                            const res = await oI.getFactorsSetupForUser(input);
                            if (mfaInfo?.alreadySetup) {
                                return mfaInfo.alreadySetup;
                            }
                            return res;
                        },
                        assertAllowedToSetupFactorElseThrowInvalidClaimError: async (input) => {
                            if (mfaInfo?.allowedToSetup) {
                                if (!mfaInfo.allowedToSetup.includes(input.factorId)) {
                                    throw new Session.Error({
                                        type: "INVALID_CLAIMS",
                                        message: "INVALID_CLAIMS",
                                        payload: [
                                            {
                                                id: "test",
                                                reason: "test override",
                                            },
                                        ],
                                    });
                                }
                            } else {
                                await oI.assertAllowedToSetupFactorElseThrowInvalidClaimError(input);
                            }
                        },
                        getMFARequirementsForAuth: async (input) => {
                            const res = await oI.getMFARequirementsForAuth(input);
                            if (mfaInfo?.requirements) {
                                return mfaInfo.requirements;
                            }
                            return res;
                        },
                    }),
                    apis: (oI) => ({
                        ...oI,
                        resyncSessionAndFetchMFAInfoPUT: async (input) => {
                            const res = await oI.resyncSessionAndFetchMFAInfoPUT(input);

                            if (res.status === "OK") {
                                if (mfaInfo.alreadySetup) {
                                    res.factors.alreadySetup = [...mfaInfo.alreadySetup];
                                }
                            }
                            if (mfaInfo.noContacts) {
                                res.emails = {};
                                res.phoneNumbers = {};
                            }
                            return res;
                        },
                    }),
                },
            }),
        ]);
    }

    if (totpSupported) {
        recipeList.push([
            "totp",
            TOTP.init({
                defaultPeriod: 1,
                defaultSkew: 30,
            }),
        ]);
    }

    SuperTokens.init({
        appInfo: {
            appName: "SuperTokens",
            apiDomain: "localhost:" + (process.env.NODE_PORT === undefined ? 8080 : process.env.NODE_PORT),
            websiteDomain,
        },
        supertokens: {
            connectionURI,
        },
        recipeList:
            enabledRecipes !== undefined
                ? recipeList.filter(([key]) => enabledRecipes.includes(key)).map(([_key, recipeFunc]) => recipeFunc)
                : recipeList.map(([_key, recipeFunc]) => recipeFunc),
    });
}

function convertToRecipeUserIdIfAvailable(id) {
    if (SuperTokens.convertToRecipeUserId !== undefined) {
        return SuperTokens.convertToRecipeUserId(id);
    }
    return id;
}
