import { useState, useEffect } from "react";
import { env } from "@/env";
import { toast } from "sonner";

interface PostOffice {
  Name: string;
  District: string;
  State: string;
}

interface PincodeResponse {
  Status: string;
  PostOffice: PostOffice[];
}

export function usePincodeLookup(pincode: string) {
  const [fetchedDistrict, setFetchedDistrict] = useState("");
  const [fetchedState, setFetchedState] = useState("");
  const [villages, setVillages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      return;
    }

    let isMounted = true;
    const fetchPincodeDetails = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${env.NEXT_PUBLIC_PINCODE_API_URL}/${pincode}`);
        if (!res.ok) throw new Error("Failed to fetch pincode details");
        
        const data = (await res.json()) as PincodeResponse[];
        if (!isMounted) return;

        if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice) {
          const offices = data[0].PostOffice;
          if (offices.length > 0) {
            setFetchedDistrict(offices[0].District || "");
            setFetchedState(offices[0].State || "");
            setVillages(offices.map(o => o.Name));
          }
        }
      } catch (e) {
        console.error("Error fetching pincode", e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      void fetchPincodeDetails();
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [pincode]);

  return { fetchedDistrict, fetchedState, villages, isLoading };
}
