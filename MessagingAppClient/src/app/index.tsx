
import { useEffect} from 'react';
import { useRouter } from 'expo-router';


export default function HomeScreen() {
  const router = useRouter();

  useEffect(() => {
            // Always start at the registration screen
            router.replace('/registration');
        }, []);
    return (null);
}