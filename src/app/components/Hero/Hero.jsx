"use client"
import  { useEffect, useState } from 'react';
import requests from '@/app/helpers/Requests';
import Image from 'next/image';
const Home = () => {
    const [items, setItems] = useState([]);

    const fetchData = async () => {
        try {
            const request = await fetch(requests.requestPopular);
            const data = await request.json();
            setItems(data.results || []);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const item = items.length > 0 ? items[Math.floor(Math.random() * items.length)] : null;

    if (!item) {
        return (
            <div className='text-center'>
                <Image width={100} height={100} src='./img/NoImage' alt="No Image" />
                <p className='text-white'>No Movie Available</p>
            </div>
        );
    }

    return (
        <div>
            <h1 className='text-white font-bold text-[2rem] text-center'>The Movies</h1>
            <div>
                <div>{item.title}</div>
                <Image className='w-[100%] h-screen object-cover' width={100} height={100} src={`https://image.tmdb.org/t/p/original${item.backdrop_path}`} alt={item.title || "Movie Image"} />
            </div>
        </div>
    );
};

export default Home;

