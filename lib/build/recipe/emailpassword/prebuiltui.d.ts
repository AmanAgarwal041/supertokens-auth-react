/// <reference types="react" />
import { RecipeRouter } from "../recipeRouter";
import ResetPasswordUsingTokenThemeWrapper from "./components/themes/resetPasswordUsingToken";
import EmailPassword from "./recipe";
import type { GenericComponentOverrideMap } from "../../components/componentOverride/componentOverrideContext";
import type { RecipeFeatureComponentMap, FeatureBaseProps, UserContext } from "../../types";
import type { AuthComponent } from "../../types";
export declare class EmailPasswordPreBuiltUI extends RecipeRouter {
    readonly recipeInstance: EmailPassword;
    static instance?: EmailPasswordPreBuiltUI;
    languageTranslations: {
        en: {
            EMAIL_PASSWORD_EMAIL_LABEL: string;
            EMAIL_PASSWORD_EMAIL_PLACEHOLDER: string;
            EMAIL_PASSWORD_PASSWORD_LABEL: string;
            EMAIL_PASSWORD_PASSWORD_PLACEHOLDER: string;
            EMAIL_PASSWORD_SIGN_IN_FORGOT_PW_LINK: string;
            EMAIL_PASSWORD_SIGN_IN_SUBMIT_BTN: string;
            EMAIL_PASSWORD_SIGN_IN_WRONG_CREDENTIALS_ERROR: string;
            EMAIL_PASSWORD_SIGN_UP_SUBMIT_BTN: string;
            EMAIL_PASSWORD_EMAIL_ALREADY_EXISTS: string;
            EMAIL_PASSWORD_RESET_HEADER_TITLE: string;
            EMAIL_PASSWORD_RESET_HEADER_SUBTITLE: string;
            EMAIL_PASSWORD_RESET_SEND_FALLBACK_EMAIL: string;
            EMAIL_PASSWORD_RESET_SEND_BEFORE_EMAIL: string;
            EMAIL_PASSWORD_RESET_SEND_AFTER_EMAIL: string;
            EMAIL_PASSWORD_RESET_RESEND_LINK: string;
            EMAIL_PASSWORD_RESET_SEND_BTN: string;
            EMAIL_PASSWORD_RESET_SIGN_IN_LINK: string;
            EMAIL_PASSWORD_RESET_SUBMIT_PW_SUCCESS_HEADER_TITLE: string;
            EMAIL_PASSWORD_RESET_SUBMIT_PW_SUCCESS_DESC: string;
            EMAIL_PASSWORD_RESET_SUBMIT_PW_SUCCESS_SIGN_IN_BTN: string;
            EMAIL_PASSWORD_NEW_PASSWORD_LABEL: string;
            EMAIL_PASSWORD_NEW_PASSWORD_PLACEHOLDER: string;
            EMAIL_PASSWORD_CONFIRM_PASSWORD_LABEL: string;
            EMAIL_PASSWORD_CONFIRM_PASSWORD_PLACEHOLDER: string;
            EMAIL_PASSWORD_RESET_SUBMIT_PW_HEADER_TITLE: string;
            EMAIL_PASSWORD_RESET_SUBMIT_PW_HEADER_SUBTITLE: string;
            EMAIL_PASSWORD_RESET_SUBMIT_PW_CHANGE_PW_BTN: string;
            EMAIL_PASSWORD_RESET_PASSWORD_INVALID_TOKEN_ERROR: string;
            ERROR_EMAIL_NON_STRING: string;
            ERROR_EMAIL_INVALID: string;
            ERROR_PASSWORD_NON_STRING: string;
            ERROR_PASSWORD_TOO_SHORT: string;
            ERROR_PASSWORD_TOO_LONG: string;
            ERROR_PASSWORD_NO_ALPHA: string;
            ERROR_PASSWORD_NO_NUM: string;
            ERROR_CONFIRM_PASSWORD_NO_MATCH: string;
            ERROR_NON_OPTIONAL: string;
            "This email already exists. Please sign in instead.": undefined;
            "Field is not optional": undefined;
            "Password must contain at least 8 characters, including a number": undefined;
            "Password's length must be lesser than 100 characters": undefined;
            "Password must contain at least one alphabet": undefined;
            "Password must contain at least one number": undefined;
            "Email is invalid": undefined;
            "Reset password link was not created because of account take over risk. Please contact support. (ERR_CODE_001)": undefined;
            "Cannot sign up due to security reasons. Please try logging in, use a different login method or contact support. (ERR_CODE_007)": undefined;
            "Cannot sign in due to security reasons. Please try resetting your password, use a different login method or contact support. (ERR_CODE_008)": undefined;
            "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_009)": undefined;
            "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_010)": undefined;
            "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_011)": undefined;
            "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_012)": undefined;
            "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_013)": undefined;
            "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_014)": undefined;
            "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_015)": undefined;
            "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_016)": undefined;
            EMAIL_VERIFICATION_RESEND_SUCCESS: string;
            EMAIL_VERIFICATION_SEND_TITLE: string;
            EMAIL_VERIFICATION_SEND_DESC_START: string;
            EMAIL_VERIFICATION_SEND_DESC_STRONG: string;
            EMAIL_VERIFICATION_SEND_DESC_END: string;
            EMAIL_VERIFICATION_RESEND_BTN: string;
            EMAIL_VERIFICATION_LOGOUT: string;
            EMAIL_VERIFICATION_SUCCESS: string;
            EMAIL_VERIFICATION_CONTINUE_BTN: string;
            EMAIL_VERIFICATION_CONTINUE_LINK: string;
            EMAIL_VERIFICATION_EXPIRED: string;
            EMAIL_VERIFICATION_ERROR_TITLE: string;
            EMAIL_VERIFICATION_ERROR_DESC: string;
            EMAIL_VERIFICATION_LINK_CLICKED_HEADER: string;
            EMAIL_VERIFICATION_LINK_CLICKED_DESC: string;
            EMAIL_VERIFICATION_LINK_CLICKED_CONTINUE_BUTTON: string;
            AUTH_PAGE_HEADER_TITLE_SIGN_IN_AND_UP: string;
            AUTH_PAGE_HEADER_TITLE_SIGN_IN: string;
            AUTH_PAGE_HEADER_TITLE_SIGN_UP: string;
            AUTH_PAGE_HEADER_TITLE_SIGN_IN_UP_TO_APP: string;
            AUTH_PAGE_HEADER_SUBTITLE_SIGN_IN_START: string;
            AUTH_PAGE_HEADER_SUBTITLE_SIGN_IN_SIGN_UP_LINK: string;
            AUTH_PAGE_HEADER_SUBTITLE_SIGN_IN_END: string;
            AUTH_PAGE_HEADER_SUBTITLE_SIGN_UP_START: string;
            AUTH_PAGE_HEADER_SUBTITLE_SIGN_UP_SIGN_IN_LINK: string;
            AUTH_PAGE_HEADER_SUBTITLE_SIGN_UP_END: string;
            AUTH_PAGE_FOOTER_START: string;
            AUTH_PAGE_FOOTER_TOS: string;
            AUTH_PAGE_FOOTER_AND: string;
            AUTH_PAGE_FOOTER_PP: string;
            AUTH_PAGE_FOOTER_END: string;
            DIVIDER_OR: string;
            BRANDING_POWERED_BY_START: string;
            BRANDING_POWERED_BY_END: string;
            SOMETHING_WENT_WRONG_ERROR: string;
            SOMETHING_WENT_WRONG_ERROR_RELOAD: string;
        };
    };
    constructor(recipeInstance: EmailPassword);
    static getInstanceOrInitAndGetInstance(): EmailPasswordPreBuiltUI;
    static getFeatures(useComponentOverrides?: () => GenericComponentOverrideMap<any>): RecipeFeatureComponentMap;
    static getFeatureComponent(
        componentName: "resetpassword",
        props: FeatureBaseProps<{
            redirectOnSessionExists?: boolean;
            userContext?: UserContext;
        }>,
        useComponentOverrides?: () => GenericComponentOverrideMap<any>
    ): JSX.Element;
    getFeatures: (useComponentOverrides?: () => GenericComponentOverrideMap<any>) => RecipeFeatureComponentMap;
    getFeatureComponent: (
        componentName: "resetpassword",
        props: FeatureBaseProps<{
            redirectOnSessionExists?: boolean;
            userContext?: UserContext;
        }>,
        useComponentOverrides?: () => GenericComponentOverrideMap<any>
    ) => JSX.Element;
    getAuthComponents(): AuthComponent[];
    requiresSignUpPage: boolean;
    static reset(): void;
    static ResetPasswordUsingToken: (
        prop: FeatureBaseProps<{
            userContext?: UserContext;
        }>
    ) => JSX.Element;
    static ResetPasswordUsingTokenTheme: typeof ResetPasswordUsingTokenThemeWrapper;
}
declare const ResetPasswordUsingToken: (
    prop: FeatureBaseProps<{
        userContext?: UserContext;
    }>
) => JSX.Element;
export { ResetPasswordUsingToken, ResetPasswordUsingTokenThemeWrapper as ResetPasswordUsingTokenTheme };
