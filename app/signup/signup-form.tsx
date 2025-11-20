"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {signup, SignupState} from "@/app/signup/actions";
import {useActionState} from "react";

const initialState: SignupState = {};

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
    const [state, action] = useActionState(signup, initialState);

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>
            Enter your email below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input name="username" id="username" type="text" placeholder="johndoe123" defaultValue={state?.fields?.username ?? ""} required />
                {state?.errors?.username && (
                  <FieldError>{state.errors.username}</FieldError>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  name="email"
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  defaultValue={state?.fields?.email ?? ""}
                  required
                />
                <FieldDescription>Your email is not stored on our servers</FieldDescription>
                {state?.errors?.email && (
                  <FieldError>{state.errors.email}</FieldError>
                )}
              </Field>
              <Field>
                <Field className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input name="password" id="password" type="password" defaultValue={state?.fields?.password ?? ""} required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password">
                      Confirm Password
                    </FieldLabel>
                    <Input name="confirm-password" id="confirm-password" type="password" defaultValue={state?.fields?.confirmPassword ?? ""} required />
                  </Field>
                </Field>
                {state?.errors?.password && (
                  <FieldError>{state.errors.password}</FieldError>
                )}
                {state?.errors?.confirmPassword && (
                  <FieldError>{state.errors.confirmPassword}</FieldError>
                )}
                <FieldDescription>
                  Must be at least 8 characters long.
                </FieldDescription>
              </Field>
              <Field>
                <Button type="submit">Create Account</Button>
                <FieldDescription className="text-center">
                  Already have an account? <a href="#">Sign in</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
