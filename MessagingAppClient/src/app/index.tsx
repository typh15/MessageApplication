
import { useEffect} from 'react';
import { useRouter } from 'expo-router';

import * as APIHandler from '@/APIHandlers/ApiHandlerHub';
import { clearSession } from '@/hooks/use-session';

export default function HomeScreen() {
    const router = useRouter();

    useEffect(() => 
        {
        async function loadInitialRoute() 
            {
                if (await APIHandler.validateCurrentSession()) {
                    router.replace('/Homescreen-Board-Select-Page');
                } else {
                    await clearSession();
                    router.replace('/Login-Registration-Page');
                }
            }

        loadInitialRoute();
        
        }, []);

    return (null);
}
