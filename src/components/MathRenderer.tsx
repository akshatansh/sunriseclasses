import React from 'react';

interface MathRendererProps {
  text: string;
  className?: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ text, className = '' }) => {
  if (!text) return null;

  // Function to convert common LaTeX math syntax into clean formatted HTML
  const formatMathText = (input: string) => {
    if (!input) return '';

    let formatted = input;

    // Convert \frac{num}{den} -> (num / den) with vertical fraction styling
    formatted = formatted.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '<span class="inline-flex flex-col items-center align-middle mx-1 px-1 border-b border-current"><span class="text-xs leading-tight font-semibold">$1</span><span class="text-xs leading-tight border-t border-gray-400 w-full text-center font-semibold">$2</span></span>');

    // Convert \sqrt{val} -> √val
    formatted = formatted.replace(/\\sqrt\{([^}]+)\}/g, '<span class="inline-flex items-center font-semibold">&radic;<span class="border-t border-current px-0.5">$1</span></span>');

    // Convert \pm -> ±
    formatted = formatted.replace(/\\pm/g, '&plusmn;');
    // Convert \times -> ×
    formatted = formatted.replace(/\\times/g, '&times;');
    // Convert \div -> ÷
    formatted = formatted.replace(/\\div/g, '&divide;');
    // Convert \theta -> θ
    formatted = formatted.replace(/\\theta/g, '&theta;');
    // Convert \pi -> π
    formatted = formatted.replace(/\\pi/g, '&pi;');
    // Convert \alpha -> α
    formatted = formatted.replace(/\\alpha/g, '&alpha;');
    // Convert \beta -> β
    formatted = formatted.replace(/\\beta/g, '&beta;');
    // Convert \infty -> ∞
    formatted = formatted.replace(/\\infty/g, '&infin;');
    // Convert \le or \leq -> ≤
    formatted = formatted.replace(/\\le(q)?/g, '&le;');
    // Convert \ge or \geq -> ≥
    formatted = formatted.replace(/\\ge(q)?/g, '&ge;');
    // Convert \ne or \neq -> ≠
    formatted = formatted.replace(/\\ne(q)?/g, '&ne;');

    // Superscript x^2 or x^{12}
    formatted = formatted.replace(/\^{([^}]+)}/g, '<sup>$1</sup>');
    formatted = formatted.replace(/\^([0-9a-zA-Z+-]+)/g, '<sup>$1</sup>');

    // Subscript x_1 or x_{12}
    formatted = formatted.replace(/_\{([^}]+)\}/g, '<sub>$1</sub>');
    formatted = formatted.replace(/_([0-9a-zA-Z+-]+)/g, '<sub>$1</sub>');

    return formatted;
  };

  // Split by inline math delimiters $...$ or LaTeX blocks
  const parts = text.split(/(\$[^$]+\$)/g);

  return (
    <span className={`inline-wrap ${className}`}>
      {parts.map((part, index) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          const rawMath = part.slice(1, -1);
          return (
            <span
              key={index}
              className="inline-math font-mono bg-blue-50/80 text-blue-950 dark:bg-blue-950/40 dark:text-blue-200 px-1.5 py-0.5 rounded border border-blue-200/60 dark:border-blue-800/60 font-medium"
              dangerouslySetInnerHTML={{ __html: formatMathText(rawMath) }}
            />
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

export default MathRenderer;
