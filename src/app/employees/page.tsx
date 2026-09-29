'use client';

import { useEffect } from'react';
import { useRouter } from'next/navigation';

export default function EmployeesIndexPage() {
 const router = useRouter();

 useEffect(() => {
 router.replace('/employees/directory');
 }, [router]);

 return null;
}