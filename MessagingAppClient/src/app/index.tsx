
import { useEffect} from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import * as APIHandler from '@/ApiHandler';

export default function HomeScreen() {
    const router = useRouter();

    useEffect(() => 
        {
        async function loadInitialRoute() 
            {
                const uniqueId = await AsyncStorage.getItem('uniqueid');

                if (uniqueId && await APIHandler.validateActiveUser(uniqueId)) {
                    router.replace('/boards');
                } else {
                    await AsyncStorage.removeItem('uniqueid');
                    router.replace('/registration');
                }
            }

        loadInitialRoute();
        
        }, []);

    return (null);
}
