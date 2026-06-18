import { checkPasswordStrength } from '../lib/passwordStrength';

export default function PasswordStrength({ password }) {
  if (!password) return null;
  const strength = checkPasswordStrength(password);

  return (
    <div className="mt-1">
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${strength.color.replace('text-', 'bg-')}`}
          style={{ width: `${strength.percentage}%` }}
        />
      </div>
      <p className={`text-xs mt-1 ${strength.color}`}>{strength.level}</p>
      {strength.feedback.length > 0 && (
        <ul className="text-xs text-gray-400 mt-1">
          {strength.feedback.map((f, i) => <li key={i}>• {f}</li>)}
        </ul>
      )}
    </div>
  );
}
