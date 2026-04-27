import { useEffect, useCallback } from 'react';

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
const SCRIPT_ID = 'recaptcha-v3-script';

/**
 * Loads the Google reCAPTCHA v3 script once and returns an executor.
 *
 * Usage:
 *   const { executeRecaptcha } = useRecaptcha();
 *
 *   const handleSubmit = async () => {
 *     const captchaToken = await executeRecaptcha('login');
 *     await api.post('/auth/login', { ...form, captchaToken });
 *   };
 */
export function useRecaptcha() {
    useEffect(() => {
        if (!SITE_KEY) {
            console.warn('[reCAPTCHA] VITE_RECAPTCHA_SITE_KEY is not set.');
            return;
        }
        // Idempotent — skip if the script tag already exists in the DOM.
        if (document.getElementById(SCRIPT_ID)) return;

        const script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
        script.async = true;
        document.head.appendChild(script);
    }, []);

    /**
     * Executes reCAPTCHA for a given action and resolves with the token.
     * Safe to call immediately on form submit — waits internally for the
     * script to finish loading if it hasn't yet.
     *
     * @param {string} action  Must match the expectedAction on the backend route.
     * @returns {Promise<string>} reCAPTCHA token to include in the request body.
     */
    const executeRecaptcha = useCallback((action) => {
        const TIMEOUT_MS = 10000;

        const captchaPromise = new Promise((resolve, reject) => {
            if (!SITE_KEY) {
                return reject(new Error('[reCAPTCHA] VITE_RECAPTCHA_SITE_KEY is not configured'));
            }

            const run = () => {
                window.grecaptcha
                    .execute(SITE_KEY, { action })
                    .then(resolve)
                    .catch(reject);
            };

            // grecaptcha.ready fires immediately when already loaded, or queues
            // the callback until the script finishes initialising.
            if (window.grecaptcha?.ready) {
                window.grecaptcha.ready(run);
                return;
            }

            // Fallback poll — handles edge cases where the global isn't set yet
            // (e.g. script injected this render cycle).
            let attempts = 0;
            const poll = setInterval(() => {
                attempts++;
                if (window.grecaptcha?.ready) {
                    clearInterval(poll);
                    window.grecaptcha.ready(run);
                } else if (attempts >= 100) {
                    clearInterval(poll);
                    reject(new Error('[reCAPTCHA] Timed out waiting for script to load'));
                }
            }, 100);
        });

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('[reCAPTCHA] Token request timed out')), TIMEOUT_MS)
        );

        return Promise.race([captchaPromise, timeoutPromise]);
    }, []);

    return { executeRecaptcha };
}
