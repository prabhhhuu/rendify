import puter from "@heyputer/puter.js"
import {getOrCreateHosting, uploadImageToHosting} from "./puter.hosting";
import {isHostedUrl} from "./utils";
import {PUTER_WORKER_URL} from "./constants";

export const signIn = async () => await puter.auth.signIn();

export const signOut = async () => puter.auth.signOut();

export const getCurrentUser = async () => {
    try{
        return await puter.auth.getUser();
    } catch {
        return null;
    }
}

export const createProject = async ({ item, visibility = 'private' } : CreateProjectParams): Promise<DesignItem | null | undefined> => {
    if(!PUTER_WORKER_URL) {
        console.warn('Missing VITE PUTER_WORKER_URL; skip history fetch;');
        return null;
    }
        const projectId = item.id;

        const hosting = await getOrCreateHosting();
        const  hostedSource = projectId ?
            await uploadImageToHosting({
                hosting, url: item.sourceImage, projectId,
                label: 'source', }) : null;

        const hostedRender = projectId && item.renderedImage ?
            await uploadImageToHosting({
                hosting, url: item.renderedImage, projectId,
                label: 'rendered', }): null;

        const resolvedSource = hostedSource?.url || (isHostedUrl(item.sourceImage)
            ? item.sourceImage
            : '')
        if(!resolvedSource) {
            console.warn('Failed to host source Image, Skipping save.')
            return null;
        }

        const resolvedRender = hostedRender?.url ? hostedRender?.url
        : item.renderedImage  && isHostedUrl(item.renderedImage)
            ? item.renderedImage
            : undefined;

        const {
            sourcePath: _sourcePath,
            renderedPath: _renderPath,
            publicPath: _publicPath,
            ...rest
        } = item;

        const payload = {
            ...rest,
            sourceImage: resolvedSource,
            renderedImage: resolvedRender,
        }

        try {
            const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project: payload, visibility })
            });

            if(!response.ok) {
                const errorText = await response.text();
                console.error('Failed to save project', errorText);
                return null;
            }

            const responseText = await response.text();
            if(!responseText || !responseText.trim()) {
                console.error('Empty response from worker');
                return null;
            }

            let data;
            try {
                data = JSON.parse(responseText) as {project?: DesignItem | null};
            } catch (parseError) {
                console.error('Failed to parse worker response as JSON:', responseText, parseError);
                return null;
            }

            return data?.project ?? null;
        }catch (e) {
            console.error('Failed to save project', e)
            return null;
        }
    }

export const getProjects = async() => {
    if(!PUTER_WORKER_URL) {
        console.warn('Missing VITE PUTER_WORKER_URL; skip history fetch;');
        return [];
    }
    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/list`, { method: 'GET'});

        if(!response.ok) {
            console.error('Failed to fetch history', await response.text());
            return [];
        }
        const data = (await response.json()) as {projects?: DesignItem[] | null};
        return Array.isArray(data?.projects) ? data?.projects : [];
    } catch (e) {
        console.warn('Failed to fetch projects', e);
        return [];
    }
}

export const getProjectById = async ({ id }: { id: string }) => {
    if (!PUTER_WORKER_URL) {
        console.warn("Missing VITE_PUTER_WORKER_URL; skipping project fetch.");
        return null;
    }

    console.log("Fetching project with ID:", id);

    try {
        const response = await puter.workers.exec(
            `${PUTER_WORKER_URL}/api/projects/get?id=${encodeURIComponent(id)}`,
            { method: "GET" },
        );

        console.log("Fetch project response:", response);

        if (!response.ok) {
            console.error("Failed to fetch project:", await response.text());
            return null;
        }

        const data = (await response.json()) as {
            project?: DesignItem | null;
        };

        console.log("Fetched project data:", data);

        return data?.project ?? null;
    } catch (error) {
        console.error("Failed to fetch project:", error);
        return null;
    }
};

