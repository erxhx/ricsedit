'use client';

import { useState } from 'react';
import {
  BookingState,
  BookingStep,
  CATEGORY_META,
  ClientInfo,
  INITIAL_BOOKING_STATE,
  Service,
  ServiceCategory,
  getSteps,
} from '@/lib/services';
import type { ServicesData } from '@/lib/services-store';
import StepCategory from './StepCategory';
import StepClient from './StepClient';
import StepConfirm from './StepConfirm';
import StepDateTime from './StepDateTime';
import StepDone from './StepDone';
import StepService from './StepService';
import StepWaiver from './StepWaiver';

const STEP_LABELS: Partial<Record<BookingStep, string>> = {
  service: 'Service',
  datetime: 'Date & time',
  client: 'Details',
  waiver: 'Intake',
  confirm: 'Confirm',
};

export default function BookingFlow({ servicesData }: { servicesData?: ServicesData }) {
  const [state, setState] = useState<BookingState>(INITIAL_BOOKING_STATE);
  const [currentStep, setCurrentStep] = useState<BookingStep>('category');

  const steps = getSteps(state.selectedServices);
  const progressSteps = steps.filter((s) => s !== 'category' && s !== 'done');
  const currentProgressIndex = progressSteps.indexOf(
    currentStep as (typeof progressSteps)[number],
  );

  function goTo(step: BookingStep) {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function nextStep() {
    const idx = steps.indexOf(currentStep);
    if (idx < steps.length - 1) goTo(steps[idx + 1]);
  }

  function prevStep() {
    const idx = steps.indexOf(currentStep);
    if (idx > 0) goTo(steps[idx - 1]);
  }

  function handleCategorySelect(category: ServiceCategory) {
    setState({ ...INITIAL_BOOKING_STATE, category });
    goTo('service');
  }

  function handleServicesChange(services: Service[]) {
    setState((prev) => ({ ...prev, selectedServices: services }));
  }

  function handleDateChange(date: Date) {
    setState((prev) => ({ ...prev, date, timeSlot: null }));
  }

  function handleTimeChange(slot: string) {
    setState((prev) => ({ ...prev, timeSlot: slot }));
  }

  function handleClientChange(client: ClientInfo) {
    setState((prev) => ({ ...prev, client }));
  }

  function handleWaiverChange(accepted: boolean) {
    setState((prev) => ({ ...prev, waiverAccepted: accepted }));
  }

  function handleConfirmed() {
    goTo('done');
  }

  function handleReset() {
    setState(INITIAL_BOOKING_STATE);
    setCurrentStep('category');
  }

  const accent = state.category ? CATEGORY_META[state.category].accent : 'oklch(0.32 0.04 30)';

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f6f4ef', color: '#1a1814' }}>
      <div className="max-w-md mx-auto px-5 pt-8 pb-16">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <a href="/" className="text-sm font-medium tracking-tight opacity-70 hover:opacity-100 transition-opacity">
            Edit Studio
          </a>
          {currentStep !== 'category' && currentStep !== 'done' && (
            <button onClick={handleReset} className="text-xs opacity-30 hover:opacity-60 transition-opacity">
              Start over
            </button>
          )}
        </div>

        {/* Progress bar */}
        {currentStep !== 'category' && currentStep !== 'done' && progressSteps.length > 0 && (
          <div className="mb-8">
            <div className="flex gap-1 mb-2">
              {progressSteps.map((step, i) => (
                <div
                  key={step}
                  className="h-0.5 flex-1 rounded-full transition-colors duration-300"
                  style={{
                    backgroundColor:
                      i <= currentProgressIndex ? accent : 'rgba(0,0,0,0.12)',
                  }}
                />
              ))}
            </div>
            <p className="text-xs opacity-40">
              {currentProgressIndex + 1} / {progressSteps.length}
              {STEP_LABELS[currentStep] ? ` · ${STEP_LABELS[currentStep]}` : ''}
            </p>
          </div>
        )}

        {/* Steps */}
        {currentStep === 'category' && (
          <StepCategory onSelect={handleCategorySelect} />
        )}

        {currentStep === 'service' && state.category && (
          <StepService
            category={state.category}
            selectedServices={state.selectedServices}
            onChange={handleServicesChange}
            onNext={nextStep}
            onBack={prevStep}
            servicesData={servicesData}
          />
        )}

        {currentStep === 'datetime' && state.category && (
          <StepDateTime
            category={state.category}
            selectedServices={state.selectedServices}
            date={state.date}
            timeSlot={state.timeSlot}
            onDateChange={handleDateChange}
            onTimeChange={handleTimeChange}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {currentStep === 'client' && state.category && (
          <StepClient
            category={state.category}
            client={state.client}
            onChange={handleClientChange}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {currentStep === 'waiver' && state.category && (
          <StepWaiver
            category={state.category}
            accepted={state.waiverAccepted}
            onAccept={handleWaiverChange}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {currentStep === 'confirm' && state.category && (
          <StepConfirm
            state={state}
            onBack={prevStep}
            onConfirm={handleConfirmed}
          />
        )}

        {currentStep === 'done' && (
          <StepDone state={state} onReset={handleReset} />
        )}
      </div>
    </div>
  );
}
