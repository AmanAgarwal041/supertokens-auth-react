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
 * Imports.
 */
import * as React from "react";
import { Fragment } from "react";
import { useMemo } from "react";

import AuthComponentWrapper from "../../../../../components/authCompWrapper";
import { clearErrorQueryParam, getTenantIdFromQueryParams, useRethrowInRender } from "../../../../../utils";
import { EmailVerificationClaim } from "../../../../emailverification";
import EmailVerification from "../../../../emailverification/recipe";
import { getInvalidClaimsFromResponse } from "../../../../session";
import Session from "../../../../session/recipe";
import useSessionContext from "../../../../session/useSessionContext";
import UserInputCodeFormScreenWrapper from "../../themes/userInputCodeForm/userInputCodeFormScreen";

import type { Navigate, UserContext, AuthComponentProps } from "../../../../../types";
import type { AuthSuccessContext } from "../../../../authRecipe/types";
import type Recipe from "../../../recipe";
import type {
    AdditionalLoginAttemptInfoProperties,
    ComponentOverrideMap,
    LoginAttemptInfo,
    SignInUpUserInputCodeFormProps,
} from "../../../types";
import type { RecipeInterface } from "supertokens-web-js/recipe/passwordless";
import type { User } from "supertokens-web-js/types";

export function useChildProps(
    recipe: Recipe,
    loginAttemptInfo: LoginAttemptInfo,
    onAuthSuccess: (successContext: AuthSuccessContext) => Promise<void>,
    error: string | undefined,
    onError: (err: string) => void,
    clearError: () => void,
    rebuildAuthPage: () => void,
    userContext: UserContext,
    navigate?: Navigate
): SignInUpUserInputCodeFormProps {
    const session = useSessionContext();
    const recipeImplementation = React.useMemo(
        () => getModifiedRecipeImplementation(recipe.webJSRecipe, onError, rebuildAuthPage),
        [recipe, onError, rebuildAuthPage]
    );
    const rethrowInRender = useRethrowInRender();

    return useMemo(() => {
        return {
            userContext,
            onSuccess: async (result: { createdNewRecipeUser: boolean; user: User }) => {
                let payloadAfterCall;
                try {
                    payloadAfterCall = await Session.getInstanceOrThrow().getAccessTokenPayloadSecurely({
                        userContext,
                    });
                } catch {
                    payloadAfterCall = undefined;
                }
                return onAuthSuccess({
                    createdNewUser: result.createdNewRecipeUser && result.user.loginMethods.length === 1,
                    isNewRecipeUser: result.createdNewRecipeUser,
                    newSessionCreated:
                        session.loading ||
                        !session.doesSessionExist ||
                        (payloadAfterCall !== undefined &&
                            session.accessTokenPayload.sessionHandle !== payloadAfterCall.sessionHandle),
                    recipeId: "passwordless",
                }).catch(rethrowInRender);
            },
            onFetchError: async (err: Response) => {
                if (err.status === Session.getInstanceOrThrow().config.invalidClaimStatusCode) {
                    const invalidClaims = await getInvalidClaimsFromResponse({ response: err, userContext });
                    if (invalidClaims.some((i) => i.id === EmailVerificationClaim.id)) {
                        try {
                            // it's OK if this throws,
                            const evInstance = EmailVerification.getInstanceOrThrow();
                            await evInstance.redirect(
                                {
                                    action: "VERIFY_EMAIL",
                                    tenantIdFromQueryParams: getTenantIdFromQueryParams(),
                                },
                                navigate,
                                undefined,
                                userContext
                            );
                            return;
                        } catch {
                            // If we couldn't redirect to EV we fall back to showing the something went wrong error
                        }
                    }
                }
                onError("SOMETHING_WENT_WRONG_ERROR");
            },
            loginAttemptInfo,
            error,
            onError,
            clearError,
            recipeImplementation: recipeImplementation,
            config: recipe.config,
        };
    }, [error, recipeImplementation]);
}

const UserInputCodeFeatureInner: React.FC<
    AuthComponentProps & {
        recipe: Recipe;
        loginAttemptInfo: LoginAttemptInfo;
        useComponentOverrides: () => ComponentOverrideMap;
    }
> = (props) => {
    const childProps = useChildProps(
        props.recipe,
        props.loginAttemptInfo,
        props.onAuthSuccess,
        props.error,
        props.onError,
        props.clearError,
        props.rebuildAuthPage,
        props.userContext,
        props.navigate
    )!;

    return (
        <Fragment>
            {/* No custom theme, use default. */}
            {props.children === undefined && (
                <UserInputCodeFormScreenWrapper {...childProps} userContext={props.userContext} />
            )}

            {/* Otherwise, custom theme is provided, propagate props. */}
            {props.children &&
                React.Children.map(props.children, (child) => {
                    if (React.isValidElement(child)) {
                        return React.cloneElement(child, {
                            ...childProps,
                        });
                    }
                    return child;
                })}
        </Fragment>
    );
};

export const UserInputCodeFeature: React.FC<
    AuthComponentProps & {
        recipe: Recipe;
        loginAttemptInfo: LoginAttemptInfo;
        userContext?: UserContext;
        useComponentOverrides: () => ComponentOverrideMap;
    }
> = (props) => {
    const recipeComponentOverrides = props.useComponentOverrides();

    return (
        <AuthComponentWrapper recipeComponentOverrides={recipeComponentOverrides}>
            <UserInputCodeFeatureInner {...props} />
        </AuthComponentWrapper>
    );
};

export default UserInputCodeFeature;

function getModifiedRecipeImplementation(
    originalImpl: RecipeInterface,
    setError: (err: string) => void,
    rebuildAuthPage: () => void
): RecipeInterface {
    return {
        ...originalImpl,
        resendCode: async (input) => {
            /**
             * In this case we want the code that is calling resendCode in the
             * UI to handle STGeneralError so we let this throw
             */
            const res = await originalImpl.resendCode(input);

            if (res.status === "OK") {
                const loginAttemptInfo = await originalImpl.getLoginAttemptInfo<AdditionalLoginAttemptInfoProperties>({
                    userContext: input.userContext,
                });

                if (loginAttemptInfo !== undefined) {
                    const timestamp = Date.now();

                    await originalImpl.setLoginAttemptInfo<AdditionalLoginAttemptInfoProperties>({
                        userContext: input.userContext,
                        attemptInfo: {
                            ...loginAttemptInfo,
                            shouldTryLinkingWithSessionUser: loginAttemptInfo.shouldTryLinkingWithSessionUser ?? false,
                            lastResend: timestamp,
                        },
                    });
                }
            } else if (res.status === "RESTART_FLOW_ERROR") {
                await originalImpl.clearLoginAttemptInfo({
                    userContext: input.userContext,
                });

                setError("ERROR_SIGN_IN_UP_RESEND_RESTART_FLOW");
                rebuildAuthPage();
            }
            return res;
        },

        consumeCode: async (input) => {
            const res = await originalImpl.consumeCode(input);

            if (res.status === "RESTART_FLOW_ERROR") {
                await originalImpl.clearLoginAttemptInfo({
                    userContext: input.userContext,
                });

                setError("ERROR_SIGN_IN_UP_CODE_CONSUME_RESTART_FLOW");
                rebuildAuthPage();
            } else if (res.status === "SIGN_IN_UP_NOT_ALLOWED") {
                await originalImpl.clearLoginAttemptInfo({
                    userContext: input.userContext,
                });

                setError(res.reason);
                rebuildAuthPage();
            } else if (res.status === "OK") {
                await originalImpl.clearLoginAttemptInfo({
                    userContext: input.userContext,
                });
            }

            return res;
        },

        clearLoginAttemptInfo: async (input) => {
            await originalImpl.clearLoginAttemptInfo({
                userContext: input.userContext,
            });
            clearErrorQueryParam();
            rebuildAuthPage();
        },
    };
}
