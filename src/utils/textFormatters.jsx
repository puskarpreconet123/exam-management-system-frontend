import React from 'react';

export const renderTextWithFractions = (text) => {
    if (typeof text !== 'string') return text;

    // 1. First, identify fractions.
    // Term: one or more of (sequence of non-special chars OR parenthesized group)
    const term = "(?:[^\\s/()\\[\\]{},]+|\\([^)]+\\))+";
    const fractionRegex = new RegExp(`(${term}\\s*\\/\\s*${term})`, 'g');
    const exactFractionRegex = new RegExp(`^(${term})\\s*\\/\\s*(${term})$`);

    const parts = text.split(fractionRegex);
    
    if (parts.length > 1) {
        return parts.map((part, index) => {
            const match = part.match(exactFractionRegex);
            if (match) {
                let num = match[1].trim();
                let den = match[2].trim();
                
                // The user requested that we do NOT strip the enclosing brackets.
                // Keeping original num and den.

                return (
                    <span key={index} className="inline-flex flex-col items-center justify-center align-middle mx-1 text-[0.85em] leading-none relative -top-[0.15em]">
                        <span className="border-b border-current px-1 pb-[1px]">{renderTextWithFractions(num)}</span>
                        <span className="px-1 pt-[1px]">{renderTextWithFractions(den)}</span>
                    </span>
                );
            }
            return <React.Fragment key={index}>{renderTextWithFractions(part)}</React.Fragment>;
        });
    }

    // 2. If no fractions in this part, check for exponents (e.g. x^2, x^(2), x^{2})
    const powerRegex = /(\^(?:[a-zA-Z0-9.\-]+|\([^)]+\)|\{[^}]+\}|\[[^\]]+\]))/g;
    const exactPowerRegex = /^\^((?:[a-zA-Z0-9.\-]+|\([^)]+\)|\{[^}]+\}|\[[^\]]+\]))$/;

    const powerParts = text.split(powerRegex);
    if (powerParts.length > 1) {
        return powerParts.map((part, index) => {
            const match = part.match(exactPowerRegex);
            if (match) {
                let inner = match[1];
                // The user requested that we do NOT strip the enclosing brackets for exponents either.
                // Keeping original inner exponent.
                
                return <sup key={index} className="text-[0.75em]">{renderTextWithFractions(inner)}</sup>;
            }
            return <React.Fragment key={index}>{renderTextWithFractions(part)}</React.Fragment>;
        });
    }

    // 3. Base case: plain text
    return text;
};
