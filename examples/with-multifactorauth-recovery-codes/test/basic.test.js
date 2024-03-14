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

/*
 * Imports
 */

const assert = require("assert");
const puppeteer = require("puppeteer");
const {
    getTestEmail,
    getTestPhoneNumber,
    setInputValues,
    submitForm,
    toggleSignInSignUp,
    waitForSTElement,
    chooseFactor,
} = require("../../../test/exampleTestHelpers");

const SuperTokensNode = require("../backend/node_modules/supertokens-node");
const Session = require("../backend/node_modules/supertokens-node/recipe/session");
const EmailVerification = require("../backend/node_modules/supertokens-node/recipe/emailverification");
const EmailPassword = require("../backend/node_modules/supertokens-node/recipe/emailpassword");
const Passwordless = require("../backend/node_modules/supertokens-node/recipe/passwordless");

const OTPAuth = require("otpauth");

// Run the tests in a DOM environment.
require("jsdom-global")();

const apiDomain = "http://localhost:3001";
const websiteDomain = "http://localhost:3000";
SuperTokensNode.init({
    supertokens: {
        // We are running these tests without running a local ST instance
        connectionURI: "https://try.supertokens.com",
    },
    appInfo: {
        // These largely shouldn't matter except for creating links which we can change anyway
        apiDomain: apiDomain,
        websiteDomain: websiteDomain,
        appName: "testNode",
    },
    recipeList: [
        EmailVerification.init({ mode: "OPTIONAL" }),
        EmailPassword.init(),
        Session.init(),
        Passwordless.init({
            contactMethod: "EMAIL_OR_PHONE",
            flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
        }),
    ],
});

describe("SuperTokens Example Basic tests", function () {
    let browser;
    let page;
    const email = getTestEmail();
    const phoneNumber = getTestPhoneNumber();
    const testPW = "Str0ngP@ssw0rd";

    before(async function () {
        browser = await puppeteer.launch({
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
            headless: true,
        });
        page = await browser.newPage();
    });

    after(async function () {
        await browser.close();
    });

    describe("MultiFactorAuth", function () {
        it("Successful signup with multiple credentials", async function () {
            await Promise.all([page.goto(websiteDomain), page.waitForNavigation({ waitUntil: "networkidle0" })]);

            // redirected to /auth
            await toggleSignInSignUp(page);
            await setInputValues(page, [
                { name: "email", value: email },
                { name: "password", value: testPW },
            ]);
            await submitForm(page);

            // Redirected to email verification screen
            await waitForSTElement(page, "[data-supertokens~='sendVerifyEmailIcon']");
            const userId = await page.evaluate(() => window.__supertokensSessionRecipe.getUserId());

            // Attempt reloading Home
            await Promise.all([page.goto(websiteDomain), page.waitForNavigation({ waitUntil: "networkidle0" })]);
            await waitForSTElement(page, "[data-supertokens~='sendVerifyEmailIcon']");

            // Create a new token and use it (we don't have access to the originally sent one)
            const tokenInfo = await EmailVerification.createEmailVerificationToken(
                "public",
                SuperTokensNode.convertToRecipeUserId(userId),
                email
            );
            await page.goto(`${websiteDomain}/auth/verify-email?token=${tokenInfo.token}`);

            await submitForm(page);

            const origTOTPSecret = await getTOTPSecret(page);
            await completeTOTP(page, origTOTPSecret);

            const addRecoveryCode = await page.waitForSelector(".createRecoveryCode");
            await addRecoveryCode.click();

            const recoveryCodeDiv = await page.waitForSelector(".recovery-code", { visible: true });
            const recoveryCode = await recoveryCodeDiv.evaluate((e) => e.textContent);

            await page.click(".homeButton");
            await page.waitForSelector("#user-id");

            let logoutLink = await page.waitForSelector("div.bottom-links-container > div:nth-child(3) > div");
            await logoutLink.click();

            await setInputValues(page, [
                { name: "email", value: email },
                { name: "password", value: testPW },
            ]);
            await submitForm(page);

            const recoveryLink = await waitForSTElement(page, ["[data-supertokens~=lostDevice]"]);
            await recoveryLink.click();

            const recoveryCodeInput = await page.waitForSelector("input[name=recoveryCode]");
            await recoveryCodeInput.type(recoveryCode);
            await page.click(".recoveryForm .sessionButton");

            const newTOTPSecret = await getTOTPSecret(page);
            await completeTOTP(page, newTOTPSecret);
            await page.waitForSelector(".createRecoveryCode");
            await page.click(".createRecoveryCode");
            await page.waitForSelector(".recovery-code", { visible: true });
            await page.click(".homeButton");
            await page.waitForSelector("#user-id");

            logoutLink = await page.waitForSelector("div.bottom-links-container > div:nth-child(3) > div");
            await logoutLink.click();

            await setInputValues(page, [
                { name: "email", value: email },
                { name: "password", value: testPW },
            ]);
            await submitForm(page);
            await completeTOTP(page, newTOTPSecret, 1);

            await page.waitForSelector("#user-id");
            await page.click("div.bottom-links-container > div:nth-child(3) > div");

            await setInputValues(page, [
                { name: "email", value: email },
                { name: "password", value: testPW },
            ]);
            await submitForm(page);
            await completeTOTP(page, origTOTPSecret, 1);
            const errorEle = await waitForSTElement(page, "[data-supertokens~=generalError");
            const errorText = await errorEle.evaluate((e) => e.innerText);
            assert.strictEqual(
                errorText,
                "Invalid TOTP. Please try again. 5 attempt(s) remaining before account is temporarily locked."
            );
        });
    });
});

async function getTOTPSecret(page) {
    const showSecret = await waitForSTElement(page, "[data-supertokens~=showTOTPSecretBtn]");
    await showSecret.click();

    const secretDiv = await waitForSTElement(page, "[data-supertokens~=totpSecret]");
    const secret = await secretDiv.evaluate((e) => e.textContent);
    return secret;
}

async function completeTOTP(page, secret, offset = 0) {
    const totp = new OTPAuth.TOTP({ secret });
    const currCode = totp.generate({ timestamp: Date.now() + offset * 30000 });

    await setInputValues(page, [{ name: "totp", value: currCode }]);
    await submitForm(page);
}
