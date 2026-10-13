"use client";
import { env } from "@/env";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner"; // Assuming sonner is used, if not I'll use alert

const formSchema = z.object({
  firstName: z.string().optional(),
  middleName: z.string().optional(),
  lastName: z.string().optional(),
  fatherName: z.string().optional(),
  mobile: z.string().min(10, "Mobile must be at least 10 digits"),
  dob: z.string().optional(),
  pincode: z.string().length(6, "Pincode must be 6 digits"),
  village: z.string().min(1, "Village is required"),
  district: z.string().min(1, "District is required"),
  state: z.string().min(1, "State is required"),
  address: z.string().min(5, "Full address is required"),
  branchId: z.string().min(1, "Branch is required"),
});

interface CustomerFormProps {
  onSuccess?: () => void;
  isManager?: boolean;
  initialData?: any;
}

export function CustomerForm({
  onSuccess,
  isManager = false,
  initialData,
}: CustomerFormProps) {
  const [isFetchingPincode, setIsFetchingPincode] = useState(false);
  const [villages, setVillages] = useState<string[]>([]);

  const { data: branches } = api.inventory.getBranches.useQuery();
  const { data: me } = api.users.getMe.useQuery();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      firstName: initialData.name?.split(" ")[0] || "",
      middleName: "",
      lastName: initialData.name?.split(" ").slice(1).join(" ") || "",
      fatherName: initialData.fatherName || "",
      mobile: initialData.mobile || "",
      dob: initialData.dob ? new Date(initialData.dob).toISOString().split('T')[0] : "",
      pincode: initialData.pincode || "",
      village: initialData.village || "",
      district: initialData.district || "",
      state: initialData.state || "",
      address: initialData.address || "",
      branchId: initialData.branchId?.toString() || "",
    } : {
      firstName: "",
      middleName: "",
      lastName: "",
      fatherName: "",
      mobile: "",
      dob: "",
      pincode: "",
      village: "",
      district: "",
      state: "",
      address: "",
      branchId: "",
    },
  });

  const pincode = form.watch("pincode");

  useEffect(() => {
    if (me?.branchId) {
      form.setValue("branchId", me.branchId.toString());
    }
  }, [me, form]);

  useEffect(() => {
    if (pincode?.length === 6 && /^[1-9][0-9]{5}$/.test(pincode)) {
      const fetchDetails = async () => {
        setIsFetchingPincode(true);
        try {
          const res = await fetch(
            `${env.NEXT_PUBLIC_PINCODE_API_URL}/${pincode}`,
          );
          const data = (await res.json()) as {
            Status: string;
            PostOffice: { Name: string; District: string; State: string }[];
          }[];
          if (Array.isArray(data) && data[0]?.Status === "Success") {
            const postOffices = data[0].PostOffice;
            const firstPostOffice = postOffices[0];
            if (firstPostOffice) {
              const district = firstPostOffice.District;
              const state = firstPostOffice.State;
              const villageList = postOffices.map((po) => po.Name);

              form.setValue("district", district);
              form.setValue("state", state);
              setVillages(villageList);

              if (villageList.length > 0 && villageList[0]) {
                form.setValue("village", villageList[0]);
              }
            }
          }
        } catch (e) {
          console.error("Failed to fetch pincode details", e);
        } finally {
          setIsFetchingPincode(false);
        }
      };
      void fetchDetails();
    }
  }, [pincode, form]);

  const updateMutation = api.crm.updateCustomer.useMutation({
    onSuccess: () => {
      toast.success("Customer updated successfully");
      onSuccess?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const proposeMutation = api.crm.proposeCustomer.useMutation({
    onSuccess: () => {
      toast.success("Customer proposed successfully (Draft status)");
      form.reset();
      onSuccess?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const createMutation = api.crm.createCustomer.useMutation({
    onSuccess: () => {
      toast.success("Customer created successfully (Approved status)");
      form.reset();
      onSuccess?.();
    },
    onError: (e) => toast.error(e.message),
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const formattedValues = {
      ...values,
      dob: values.dob ? new Date(values.dob) : undefined,
      branchId: parseInt(values.branchId, 10),
    };

    if (isManager) {
      createMutation.mutate(formattedValues);
    } else {
      proposeMutation.mutate(formattedValues);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {initialData ? "Edit Customer" : (isManager ? "Add Approved Customer" : "Propose New Customer")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="middleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Middle Name</FormLabel>
                    <FormControl>
                      <Input placeholder="A." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="fatherName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Father's Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Richard Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl>
                      <Input placeholder="9876543210" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="branchId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Operating Branch</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Branch" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {branches?.map((b) => (
                        <SelectItem key={b.id} value={b.id.toString()}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="dob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pincode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Pincode
                      {isFetchingPincode && (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="110001" maxLength={6} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="village"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Village/Area</FormLabel>
                    {villages.length > 0 ? (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Village" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {villages.map((v) => (
                            <SelectItem key={v} value={v}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <FormControl>
                        <Input placeholder="Enter Village" {...field} />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>District</FormLabel>
                    <FormControl>
                      <Input placeholder="District" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="State" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Address</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="House No, Landmark, etc."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Added By Field */}
            <div className="mt-4">
              <FormItem>
                <FormLabel>Added By</FormLabel>
                <FormControl>
                  <Input 
                    value={me ? `${me.firstName} ${me.lastName ?? ""}`.trim() : "Loading..."} 
                    readOnly 
                    disabled
                    className="bg-gray-50 text-gray-500"
                  />
                </FormControl>
              </FormItem>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={proposeMutation.isPending || createMutation.isPending || updateMutation.isPending}
            >
              {(proposeMutation.isPending || createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {initialData ? "Update Customer" : (isManager ? "Create Customer" : "Propose Customer")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
