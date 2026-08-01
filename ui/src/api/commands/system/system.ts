import { invoke } from "@/api/invoke";

import { clipboard } from "./clipboard";

async function invokeSystemResult<TResult>(
	command: `system.${string}`,
): Promise<TResult> {
	const result = await invoke<TResult>(command);
	if (result === undefined) {
		throw new Error(`Rust system command ${command} 未返回结果`);
	}
	return result;
}

export { clipboard };

export const system = {
	getSystemLocale: (): Promise<string> => {
		return invokeSystemResult("system.get_system_locale");
	},

	clipboard,
};
