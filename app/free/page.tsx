import type {Metadata} from "next";
import {ContactPage} from "../page";

export const metadata:Metadata={
  title:"Book a Free Initial Consultation | Jess Counselling",
  robots:{index:false,follow:false}
};

export default function FreePage(){return <ContactPage staff/>;}
