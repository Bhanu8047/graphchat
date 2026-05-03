import { AuthFrame } from '../../../components/templates/AuthFrame';
import { SignUpForm } from '../../../features/auth/components/SignUpForm';

export default function SignUpRoute() {
  return (
    <AuthFrame maxWidth="4xl">
      <SignUpForm />
    </AuthFrame>
  );
}
