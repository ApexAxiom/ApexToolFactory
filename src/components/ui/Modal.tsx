import { Fragment, type PropsWithChildren, type ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';

import { Button } from './Button';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  actions?: ReactNode;
}

export function Modal({ open, onClose, title, actions, children }: PropsWithChildren<ModalProps>) {
  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur" />
        </Transition.Child>

        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl space-y-4 rounded-2xl bg-white p-6 shadow-soft">
                <div className="flex items-start justify-between">
                  <Dialog.Title className="text-lg font-semibold text-slate-900">{title}</Dialog.Title>
                  <Button variant="ghost" onClick={onClose} aria-label="Close modal">
                    ✕
                  </Button>
                </div>
                <div className="text-sm text-slate-700">{children}</div>
                <div className="flex justify-end gap-2">
                  {actions || (
                    <Button variant="secondary" onClick={onClose}>
                      Close
                    </Button>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
