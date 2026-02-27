import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import axiosInstance from "../api/axiosInstance";

export default function useJobs({ location = "", role = "", radius = "", page = 1, limit = 20 }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [totalJobs, setTotalJobs] = useState(0);

  const params = useMemo(
    () => ({
      location,
      role,
      radius,
      page,
      limit,
    }),
    [location, role, radius, page, limit]
  );

  const fetchJobs = useCallback(async (signal, requestParams) => {
    setLoading(true);
    setError("");

    try {
      const response = await axiosInstance.get("/api/jobs", {
        params: requestParams,
        signal,
      });
      setJobs(response.data.jobs || []);
      setTotalJobs(response.data.total || 0);
    } catch (requestError) {
      if (axios.isCancel(requestError) || requestError.name === "CanceledError") {
        return;
      }
      const message = requestError.response?.data?.error || "Failed to fetch jobs.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchJobs(controller.signal, params);
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [fetchJobs, params]);

  return { jobs, loading, error, totalJobs };
}
