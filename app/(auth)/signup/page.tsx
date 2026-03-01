'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const searchParams = useSearchParams();
  const communitySlug = searchParams.get('community') || '';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    // Look up the community by slug
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('id')
      .eq('slug', communitySlug)
      .single();

    if (communityError || !community) {
      setError(
        'Community not found. Please check the link you were given and try again.',
      );
      setLoading(false);
      return;
    }

    // Create the auth account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Create a signup request for board approval
    const { error: requestError } = await supabase
      .from('signup_requests')
      .insert({
        community_id: community.id,
        user_id: authData.user?.id,
        email,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        unit_number: unitNumber || null,
      });

    if (requestError) {
      setError('Something went wrong submitting your request. Please try again.');
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Request submitted</CardTitle>
          <CardDescription>
            Your request has been sent to the community board for review. You
            will receive an email once your account is approved.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Link href="/login">
            <Button variant="outline">Back to login</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Request access</CardTitle>
        <CardDescription>
          Submit your information for board approval
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSignup}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}

          {!communitySlug && (
            <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
              No community specified. Please use the signup link provided by
              your HOA.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unitNumber">
              Unit / address number{' '}
              <span className="text-text-muted-light dark:text-text-muted-dark">
                (optional)
              </span>
            </Label>
            <Input
              id="unitNumber"
              value={unitNumber}
              onChange={(e) => setUnitNumber(e.target.value)}
              placeholder="e.g. 204, Lot 12, 123 Oak St"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone{' '}
              <span className="text-text-muted-light dark:text-text-muted-dark">
                (optional)
              </span>
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full"
            disabled={loading || !communitySlug}
          >
            {loading ? 'Submitting...' : 'Submit request'}
          </Button>

          <p className="text-center text-sm text-text-secondary-light dark:text-text-secondary-dark">
            Already have an account?{' '}
            <Link href="/login" className="font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
