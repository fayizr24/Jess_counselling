import type {Metadata} from 'next';
import ReceiptForm from './receipt-form';
export const metadata:Metadata={title:'Payment Receipt | Jess Counselling',robots:{index:false,follow:false}};
export default function ReceiptPage(){return <ReceiptForm/>;}
