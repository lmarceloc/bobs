import type { InputHTMLAttributes } from 'react';
import styles from './FormField.module.css';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  isTextarea?: boolean;
}

export function FormField({
  label,
  error,
  helperText,
  isTextarea = false,
  className,
  ...props
}: FormFieldProps) {
  const Component = isTextarea ? 'textarea' : 'input';

  return (
    <div className={`${styles.field} ${className || ''}`}>
      <label className={styles.label}>
        {label}
        {props.required && <span className={styles.required}>*</span>}
      </label>
      <Component
        className={`${styles.input} ${error ? styles.error : ''}`}
        {...(props as any)}
      />
      {error && <p className={styles.errorText}>{error}</p>}
      {helperText && !error && <p className={styles.helperText}>{helperText}</p>}
    </div>
  );
}
