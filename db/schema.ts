import {sqliteTable,text,integer,primaryKey} from 'drizzle-orm/sqlite-core';
export const bookingSlots=sqliteTable('booking_slots',{date:text('date').notNull(),minute:integer('minute').notNull(),manual:integer('manual').notNull().default(0)},t=>[primaryKey({columns:[t.date,t.minute]})]);
export const bookings=sqliteTable('bookings',{id:text('id').primaryKey(),requestKey:text('request_key').notNull().unique(),date:text('date').notNull(),minute:integer('minute').notNull(),kind:text('kind').notNull(),radius:integer('radius').notNull(),active:integer('active').notNull().default(1),notification:text('notification').notNull().default('pending'),created:text('created').notNull()});
export const bookingBlocks=sqliteTable('booking_blocks',{bookingId:text('booking_id').notNull().references(()=>bookings.id),date:text('date').notNull(),minute:integer('minute').notNull()},t=>[primaryKey({columns:[t.bookingId,t.date,t.minute]})]);

export const consultationFollowups=sqliteTable('consultation_followups',{bookingId:text('booking_id').primaryKey().references(()=>bookings.id),state:text('state').notNull().default('available'),expiresAt:integer('expires_at').notNull()});

export const bookingReferences=sqliteTable('booking_references',{bookingId:text('booking_id').primaryKey().references(()=>bookings.id),reference:text('reference').notNull().unique()});

export const contactBookingSequence=sqliteTable('contact_booking_sequence',{number:integer('number').primaryKey(),bookingId:text('booking_id').notNull().unique().references(()=>bookings.id)});

export const bookingAppointmentTypes=sqliteTable('booking_appointment_types',{bookingId:text('booking_id').primaryKey().references(()=>bookings.id),appointmentType:text('appointment_type').notNull()});

export const bookingClearances=sqliteTable('booking_clearances',{bookingId:text('booking_id').primaryKey().references(()=>bookings.id),forwardMinutes:integer('forward_minutes').notNull()});

export const bookingCaseInputs=sqliteTable('booking_case_inputs',{bookingId:text('booking_id').primaryKey().references(()=>bookings.id),reference:text('reference').notNull()});
