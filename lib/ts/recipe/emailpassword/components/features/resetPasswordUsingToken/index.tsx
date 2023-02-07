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
import { PureComponent, Fragment } from "react";

import { ComponentOverrideContext } from "../../../../../components/componentOverride/componentOverrideContext";
import FeatureWrapper from "../../../../../components/featureWrapper";
import SuperTokens from "../../../../../superTokens";
import { getQueryParams } from "../../../../../utils";
import { RecipeComponentsOverrideContextConsumer } from "../../../componentOverrideContext";
import ResetPasswordUsingTokenTheme from "../../themes/resetPasswordUsingToken";
import { defaultTranslationsEmailPassword } from "../../themes/translations";

import type { FeatureBaseProps } from "../../../../../types";
import type Recipe from "../../../recipe";

type PropType = FeatureBaseProps & {
    recipe: Recipe;
};

class ResetPasswordUsingToken extends PureComponent<
    PropType,
    { token: string | undefined; error: string | undefined }
> {
    /*
     * Constructor.
     */
    constructor(props: PropType) {
        super(props);

        const token = getQueryParams("token");
        if (token === null) {
            this.state = { token: undefined, error: undefined };
        } else {
            this.state = {
                token,
                error: undefined,
            };
        }
    }

    render = (): JSX.Element => {
        const enterEmailFormFeature = this.props.recipe.config.resetPasswordUsingTokenFeature.enterEmailForm;

        const submitNewPasswordFormFeature =
            this.props.recipe.config.resetPasswordUsingTokenFeature.submitNewPasswordForm;

        const submitNewPasswordForm =
            this.state.token === undefined
                ? undefined
                : {
                      error: this.state.error,
                      onError: (error: string) => this.setState((os) => ({ ...os, error })),
                      clearError: () => this.setState((os) => ({ ...os, error: undefined })),
                      styleFromInit: submitNewPasswordFormFeature.style,
                      formFields: submitNewPasswordFormFeature.formFields,
                      recipeImplementation: this.props.recipe.recipeImpl,
                      config: this.props.recipe.config,
                      onSignInClicked: () => {
                          void SuperTokens.getInstanceOrThrow().redirectToAuth({
                              show: "signin",
                              history: this.props.history,
                              redirectBack: false,
                          });
                      },
                      token: this.state.token,
                  };

        const enterEmailForm = {
            onBackButtonClicked: () =>
                SuperTokens.getInstanceOrThrow().redirectToAuth({
                    show: "signin",
                    history: this.props.history,
                    redirectBack: false,
                }),
            error: this.state.error,
            onError: (error: string) => this.setState((os) => ({ ...os, error })),
            clearError: () => this.setState((os) => ({ ...os, error: undefined })),
            styleFromInit: enterEmailFormFeature.style,
            formFields: enterEmailFormFeature.formFields,
            recipeImplementation: this.props.recipe.recipeImpl,
            config: this.props.recipe.config,
        };

        const props = {
            config: this.props.recipe.config,
            submitNewPasswordForm: submitNewPasswordForm,
            enterEmailForm: enterEmailForm,
        };

        return (
            <RecipeComponentsOverrideContextConsumer>
                {(value) => (
                    <ComponentOverrideContext.Provider value={value}>
                        <FeatureWrapper
                            useShadowDom={this.props.recipe.config.useShadowDom}
                            defaultStore={defaultTranslationsEmailPassword}>
                            <Fragment>
                                {/* No custom theme, use default. */}
                                {this.props.children === undefined && <ResetPasswordUsingTokenTheme {...props} />}
                                {/* Otherwise, custom theme is provided, propagate props. */}
                                {this.props.children &&
                                    React.Children.map(this.props.children, (child) => {
                                        if (React.isValidElement(child)) {
                                            return React.cloneElement(child, props);
                                        }

                                        return child;
                                    })}
                            </Fragment>
                        </FeatureWrapper>
                    </ComponentOverrideContext.Provider>
                )}
            </RecipeComponentsOverrideContextConsumer>
        );
    };
}

export default ResetPasswordUsingToken;
