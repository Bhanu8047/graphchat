import { SignUpForm } from '../../../features/auth/components/SignUpForm';

export default function SignUpRoute() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.14),_transparent_26%),linear-gradient(180deg,_#08111f_0%,_#04070f_100%)] px-4 py-8 text-slate-100 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <SignUpForm />
      </div>
    </div>
  );
}