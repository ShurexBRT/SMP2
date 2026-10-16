import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from './Input';
export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field mt-2">
      <Input {...props} type={visible ? 'text' : 'password'} />
      <button
        type="button"
        className="icon-button"
        aria-label={visible ? 'Sakrij lozinku' : 'Prikaži lozinku'}
        onClick={() => setVisible((x) => !x)}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
