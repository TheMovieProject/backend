import { getServerSession } from "next-auth";
import { authOptions } from "@/app/libs/auth_options";

export { authOptions };

export const getAuthSession = () => getServerSession(authOptions);
