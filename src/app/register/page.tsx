"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "RESOURCE",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      router.push("/login");
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Work Organiser</h1>
            <p className="text-gray-500 mt-2">Create a new account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="name"
              label="Full Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter your name"
              required
            />

            <Input
              id="email"
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Enter your email"
              required
            />

            <Input
              id="password"
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Create a password"
              required
            />

            <Select
              id="role"
              label="Role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              options={[
                { value: "RESOURCE", label: "Resource (Designer/Content/Developer)" },
                { value: "ADMIN", label: "Admin / Manager" },
              ]}
            />

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
            )}

            <Button type="submit" className="w-full" isLoading={loading}>
              Register
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <a href="/login" className="text-indigo-600 hover:text-indigo-500 font-medium">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
