'use client';

import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour-ui/button';
import { signUp } from '@usertour-ui/gql';
import { getErrorMessage } from '@usertour-ui/shared-utils';
import { useToast } from '@usertour-ui/use-toast';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour-ui/form';
import { Checkbox } from '@usertour-ui/checkbox';
import { Input } from '@usertour-ui/input';
import { Link, useParams } from 'react-router-dom';
import { SpinnerIcon } from '@usertour-ui/icons';

// Form validation schema
const registFormSchema = z.object({
  userName: z
    .string({
      required_error: 'Please input your full name.',
    })
    .max(30)
    .min(4),
  companyName: z
    .string({
      required_error: 'Please input your company name.',
    })
    .max(30)
    .min(4),
  password: z
    .string({
      required_error: 'Please input your password.',
    })
    .max(20)
    .min(8),
  isAccept: z.boolean(),
});

type RegistFormValues = z.infer<typeof registFormSchema>;

const defaultValues: Partial<RegistFormValues> = {
  userName: '',
  isAccept: false,
  companyName: '',
  password: '',
};

// Context type definition
type RegistrationContextType = {
  isLoading: boolean;
  setIsLoading: (value: boolean) => void;
  form: ReturnType<typeof useForm<RegistFormValues>>;
  onSubmit: (data: RegistFormValues) => Promise<void>;
  showError: (title: string) => void;
  registId: string | undefined;
  hideCompanyName: boolean;
};

// Create context
const RegistrationContext = React.createContext<RegistrationContextType | undefined>(undefined);

// Custom hook for using Registration context
const useRegistrationContext = () => {
  const context = React.useContext(RegistrationContext);
  if (!context) {
    throw new Error('useRegistrationContext must be used within a RegistrationProvider');
  }
  return context;
};

// Root component with context provider
const RegistrationRoot = ({
  children,
  hideCompanyName = false,
}: {
  children: React.ReactNode;
  hideCompanyName?: boolean;
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [signUpMutation] = useMutation(signUp);
  const { toast } = useToast();
  const { registId } = useParams();

  const formSchema = hideCompanyName
    ? registFormSchema.omit({ companyName: true })
    : registFormSchema;

  const form = useForm<RegistFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...defaultValues,
      ...(hideCompanyName && { companyName: undefined }),
    },
    mode: 'onChange',
  });

  const showError = (title: string) => {
    toast({
      variant: 'destructive',
      title,
    });
  };

  const onSubmit = async (formData: RegistFormValues) => {
    const { isAccept, ...others } = formData;
    if (!isAccept) {
      showError('You must accept our terms of service and privacy policy.');
      return;
    }
    try {
      setIsLoading(true);
      const submitData = hideCompanyName ? { ...others, companyName: undefined } : others;
      const { data } = await signUpMutation({
        variables: { ...submitData, code: registId },
      });
      if (data.signup.redirectUrl) {
        window.location.href = data.signup.redirectUrl;
      }
    } catch (error) {
      showError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <RegistrationContext.Provider
      value={{
        isLoading,
        setIsLoading,
        form,
        onSubmit,
        showError,
        registId,
        hideCompanyName,
      }}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>{children}</form>
      </Form>
    </RegistrationContext.Provider>
  );
};

RegistrationRoot.displayName = 'RegistrationRoot';

// Form Fields component
const RegistrationForm = () => {
  const { form, isLoading, hideCompanyName } = useRegistrationContext();

  return (
    <>
      <div className="grid gap-4">
        <FormField
          control={form.control}
          name="userName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your name</FormLabel>
              <FormControl>
                <Input placeholder="Enter your full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!hideCompanyName && (
          <FormField
            control={form.control}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your company name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input placeholder="Pick a strong password" type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="flex flex-row items-start space-x-3">
        <FormField
          control={form.control}
          name="isAccept"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <span className="text-sm text-muted-foreground">
          I accept Usertour's{' '}
          <Link to="/terms" className="underline underline-offset-4 hover:text-primary">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="underline underline-offset-4 hover:text-primary">
            Privacy Policy
          </Link>
        </span>
      </div>
      <Button className="w-full" type="submit" disabled={isLoading}>
        {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
        Let's get started
      </Button>
    </>
  );
};

RegistrationForm.displayName = 'RegistrationForm';

export { RegistrationForm, RegistrationRoot };
